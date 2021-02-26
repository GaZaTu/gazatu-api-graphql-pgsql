import { EntityManager, ObjectType, EntitySchema, ObjectID, FindOptions, FindOptionsWhere, getMetadataArgsStorage, In } from 'typeorm'
import { EntityManagerFactory } from 'typeorm/entity-manager/EntityManagerFactory'
import * as Dataloader from 'dataloader'

type EntityClass<Entity> = ObjectType<Entity> | EntitySchema<Entity> | string
type IDOrConditionsOrOptions<Entity> = string | number | Date | ObjectID | FindOptionsWhere<Entity> | FindOptions<Entity>

const registeredDataloaders = new Map<EntityClass<any>, Dataloader<string, any>>()

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

const entityManagerFactoryMethods = {
  create: EntityManagerFactory.prototype.create,
}

EntityManagerFactory.prototype.create = function (...args) {
  const entityManager = entityManagerFactoryMethods.create.apply(this, args)
  const entityManagerMethods = {
    findOne: entityManager.findOne,
    findOneOrFail: entityManager.findOneOrFail,
  }

  entityManager.findOne = function <Entity>(
    entityClass: EntityClass<Entity>,
    idOrConditionsOrOptions?: IDOrConditionsOrOptions<Entity>,
    options?: FindOptions<Entity>,
  ) {
    if (typeof idOrConditionsOrOptions === 'string') {
      return findOneWithDataloader(this, entityClass as Function, idOrConditionsOrOptions)
    }

    return entityManagerMethods.findOne.apply(this, [entityClass, idOrConditionsOrOptions, options] as any)
  }

  // entityManager.findOneOrFail = function <Entity>(
  //   entityClass: EntityClass<Entity>,
  //   idOrConditionsOrOptions?: IDOrConditionsOrOptions<Entity>,
  //   options?: FindOneOptions<Entity>,
  // ) {
  //   if (typeof idOrConditionsOrOptions === 'string') {
  //     return findOneWithDataloader(this, entityClass as Function, idOrConditionsOrOptions)
  //   }

  //   return entityManagerMethods.findOneOrFail.apply(this, [entityClass, idOrConditionsOrOptions, options] as any)
  // }

  return entityManager
}
