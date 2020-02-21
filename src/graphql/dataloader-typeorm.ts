import { EntityManager, ObjectType, EntitySchema, ObjectID, FindConditions, FindOneOptions, getMetadataArgsStorage, In } from 'typeorm'
import * as Dataloader from 'dataloader'

type EntityClass<Entity> = ObjectType<Entity> | EntitySchema<Entity> | string
type IDOrConditionsOrOptions<Entity> = string | number | Date | ObjectID | FindConditions<Entity> | FindOneOptions<Entity>

const registeredDataloaders = new Map<EntityClass<any>, Dataloader<string, any>>()

const entityManagerMethods = {
  findOne: EntityManager.prototype.findOne,
  findOneOrFail: EntityManager.prototype.findOneOrFail,
}

const findOneWithDataloader = <Entity>(manager: EntityManager, Type: Function, id: string) => {
  let registeredDataloader = registeredDataloaders.get(Type)

  if (!registeredDataloader) {
    const idColumnName = getMetadataArgsStorage()
      .filterColumns(Type)
      .filter(column => column.options.primary)
      .map(column => column.propertyName)
      .find(column => true) as string

    registeredDataloader = new Dataloader(async ids => {
      const results = await manager.find(Type, {
        where: {
          [idColumnName]: In(ids as any[]),
        },
      })

      return ids.map(id => results.find(result => (result as any)[idColumnName] === id))
    }, {
      cache: false,
    })

    registeredDataloaders.set(Type, registeredDataloader)
  }

  return registeredDataloader.load(id) as Promise<Entity>
}

EntityManager.prototype.findOne = function <Entity>(
  entityClass: EntityClass<Entity>,
  idOrConditionsOrOptions?: IDOrConditionsOrOptions<Entity>,
  options?: FindOneOptions<Entity>,
) {
  if (typeof idOrConditionsOrOptions === 'string') {
    return findOneWithDataloader(this, entityClass as Function, idOrConditionsOrOptions)
  }

  return entityManagerMethods.findOne.apply(this, [entityClass, idOrConditionsOrOptions, options] as any)
}

// EntityManager.prototype.findOneOrFail = function <Entity>(
//   entityClass: EntityClass<Entity>,
//   idOrConditionsOrOptions?: IDOrConditionsOrOptions<Entity>,
//   options?: FindOneOptions<Entity>,
// ) {
//   if (typeof idOrConditionsOrOptions === 'string') {
//     return findOneWithDataloader(this, entityClass as Function, idOrConditionsOrOptions)
//   }

//   return entityManagerMethods.findOneOrFail.apply(this, [entityClass, idOrConditionsOrOptions, options] as any)
// }
