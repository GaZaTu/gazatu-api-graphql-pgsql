import { Resolver, Query, Arg, ID } from 'type-graphql'
import { getManager, getRepository } from 'typeorm'
import { AnalyticsError } from './analytics-error.type'

@Resolver(type => AnalyticsError)
export class AnalyticsErrorResolver {
  @Query(returns => AnalyticsError, { nullable: true, complexity: 5 })
  async analyticsError(
    @Arg('id', type => ID) id: string,
  ) {
    return getManager().findOne(AnalyticsError, id)
  }

  @Query(returns => [AnalyticsError], { complexity: 5 })
  async analyticsErrors() {
    return getRepository(AnalyticsError)
      .createQueryBuilder('error')
      .select()
      .orderBy('updatedAt', 'DESC')
      .getMany()
  }
}
