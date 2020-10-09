import { EntityManager, ObjectType, EntitySchema, ObjectID, FindOptions, FindOptionsWhere, getMetadataArgsStorage, In } from 'typeorm'
import * as Dataloader from 'dataloader'

type EntityClass<Entity> = ObjectType<Entity> | EntitySchema<Entity> | string
type IDOrConditionsOrOptions<Entity> = string | number | Date | ObjectID | FindOptionsWhere<Entity> | FindOptions<Entity>

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
      const results = new Map(
        await manager.find(Type, {
          where: {
            [idColumnName]: In(ids as any[]),
          },
        }).then(entities => entities.map(entity => [(entity as any)[idColumnName], entity]))
      )

      return ids.map(id => results.get(id))
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
  options?: FindOptions<Entity>,
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
