import { Resolver, Query, Arg, ID } from 'type-graphql'
import { getMetadataStorage } from 'type-graphql/dist/metadata/getMetadataStorage'
import { getManager } from 'typeorm'
import { Node } from './node.interface'
import { fromGlobalId } from 'graphql-relay'

@Resolver()
export class NodeResolver {
  // @Query(returns => Node, { nullable: true })
  // async node<T extends Node>(
  //   @Arg('id', type => ID) id: string,
  // ) {
  //   const { type: typeName } = fromGlobalId(id)
  //   const objectType = getMetadataStorage().objectTypes.find(t => t.target.name === typeName)

  //   if (!objectType) {
  //     return null
  //   }

  //   const result = await getManager().findOne(objectType.target as typeof Node, id)

  //   if (!result) {
  //     return null
  //   }

  //   return result as T
  // }

  // @Query(returns => [Node], { nullable: true })
  // async nodes<T extends Node>(
  //   @Arg('ids', type => [ID]) ids: string[],
  // ) {
  //   return Promise.all(ids.map(id => this.node<T>(id)))
  // }

  // @Query(returns => [Node], { nullable: true })
  // async findAndCountNodes<T extends Node>() {

  // }
}
