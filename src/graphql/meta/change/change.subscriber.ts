import { EventSubscriber, EntitySubscriberInterface, InsertEvent, RemoveEvent, UpdateEvent, getManager, LessThan, EntityMetadata } from 'typeorm'
import { Node } from '../../node/node.interface'
import { Change, ChangeKind } from './change.type'
import pubsub from '../../pubsub'

export const optedOutOfChangeLogging = [Change] as (Function)[]

export const OptOutOfChangeLogging = (): ClassDecorator => {
  return Target => {
    optedOutOfChangeLogging.push(Target)
  }
}

@EventSubscriber()
export class ChangeSubscriber implements EntitySubscriberInterface {
  static clearChangesIntervalId = setInterval(async () => {
    const today1MonthAgo = new Date()
    today1MonthAgo.setDate(today1MonthAgo.getDate() - 30)

    const oldChanges = await getManager().find(Change, {
      where: {
        createdAt: LessThan(today1MonthAgo),
      },
    })

    await getManager().remove(oldChanges)
  }, 1 * 1000 * 60 * 60 * 24) // once every 24 hours

  static shouldLogEvent(event: { metadata: EntityMetadata }) {
    if (event.metadata.isJunction || event.metadata.isClosureJunction || event.metadata.hasMultiplePrimaryKeys) {
      return false
    }

    if (optedOutOfChangeLogging.map(f => f.name).includes(event.metadata.name)) {
      return false
    }

    return true
  }

  async afterInsert(event: InsertEvent<Node>) {
    if (!ChangeSubscriber.shouldLogEvent(event)) {
      return
    }

    const change = await getManager().save(new Change({
      kind: ChangeKind.INSERT,
      targetEntityName: event.metadata.name,
      targetId: event.entity.id,
      targetColumn: undefined,
      newColumnValue: undefined,
    }))

    pubsub.publish('CHANGES', change)
  }

  async afterUpdate(event: UpdateEvent<Node>) {
    if (!ChangeSubscriber.shouldLogEvent(event)) {
      return
    }

    const change = new Change({
      kind: ChangeKind.UPDATE,
      targetEntityName: event.metadata.name,
      targetId: event.entity.id,
      targetColumn: undefined,
      newColumnValue: undefined,
    })

    await Promise.all(
      event.updatedColumns.map(col => (
        getManager().save(new Change({
          ...change,
          targetColumn: col.propertyName,
          newColumnValue: (event.entity as any)[col.propertyName],
        }))
      ))
    )

    pubsub.publish('CHANGES', { ...change, id: 'synthetic', createdAt: new Date() })
  }

  async afterRemove(event: RemoveEvent<Node>) {
    if (!ChangeSubscriber.shouldLogEvent(event)) {
      return
    }

    const change = await getManager().save(new Change({
      kind: ChangeKind.REMOVE,
      targetEntityName: event.metadata.name,
      targetId: event.entityId,
      targetColumn: undefined,
      newColumnValue: undefined,
    }))

    pubsub.publish('CHANGES', change)
  }
}
