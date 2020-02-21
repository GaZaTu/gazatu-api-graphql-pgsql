import { Resolver, Query, Authorized, Subscription, Root, Args, ArgsType, Field } from 'type-graphql'
import { getManager } from 'typeorm'
import { Change, ChangeKind } from './change.type'
import { UserRoles } from '../../user/role/user-role.type'

@ArgsType()
export class NewChangeSubscriptionArgs {
  @Field(type => ChangeKind, { nullable: true })
  kind?: ChangeKind

  @Field({ nullable: true })
  targetEntityName?: string

  @Field({ nullable: true })
  targetId?: string

  @Field({ nullable: true })
  targetColumn?: string
}

@Resolver(type => Change)
export class ChangeResolver {
  @Authorized(UserRoles.ADMIN)
  @Query(returns => [Change], { complexity: 5 })
  async changes() {
    return getManager().find(Change)
  }

  @Authorized(UserRoles.ADMIN)
  @Subscription(type => Change, {
    topics: ['CHANGES'],
    filter: ({ payload, args }: { payload: Change, args: NewChangeSubscriptionArgs }) => {
      if (args.kind && payload.kind !== args.kind) {
        return false
      }

      if (args.targetEntityName && payload.targetEntityName !== args.targetEntityName) {
        return false
      }

      if (args.targetId && payload.targetId !== args.targetId) {
        return false
      }

      if (args.targetColumn && payload.targetColumn !== args.targetColumn) {
        return false
      }

      return true
    },
  })
  newChange(
    @Root() change: Change,
    @Args() args: NewChangeSubscriptionArgs,
  ) {
    return change
  }
}
