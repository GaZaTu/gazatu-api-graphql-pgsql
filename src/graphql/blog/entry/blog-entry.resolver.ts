import { Arg, Authorized, ID, Mutation, Query, Resolver } from 'type-graphql'
import { getManager, getRepository } from 'typeorm'
import { CountResult } from '../../count.result'
import { IDsResult } from '../../ids.result'
import { UserRoles } from '../../user/role/user-role.type'
import { BlogEntryInput } from './blog-entry.input'
import { BlogEntry } from './blog-entry.type'

@Resolver(type => BlogEntry)
export class BlogEntryResolver {
  @Query(returns => BlogEntry, { nullable: true, complexity: 5 })
  async blogEntry(
    @Arg('id', type => ID) id: string,
  ) {
    return getManager().findOne(BlogEntry, id)
  }

  @Query(returns => [BlogEntry], { complexity: 5 })
  async blogEntries(
    @Arg('story', type => String, { nullable: true }) story: string | null,
    @Arg('createdAt', type => Date, { nullable: true }) createdAt: Date | null,
  ) {
    let query = getRepository(BlogEntry)
      .createQueryBuilder('entry')
      .select()
      .where('1 = 1')
      .orderBy('entry."createdAt"', 'DESC')

    if (story) {
      query = query
        .andWhere('entry."story" = :story', { story })
    }

    if (createdAt) {
      query = query
        .andWhere('entry."createdAt" = :createdAt', { createdAt })
    }

    return query.getMany()
  }

  @Authorized(UserRoles.ADMIN)
  @Mutation(returns => BlogEntry, { complexity: 5 })
  async saveBlogEntry(
    @Arg('input') input: BlogEntryInput,
  ) {
    const { id, ...entryInput } = input

    const entry = new BlogEntry({
      id: id ?? undefined,
      ...entryInput,
    })

    return getManager().save(BlogEntry, entry)
  }

  @Authorized(UserRoles.ADMIN)
  @Mutation(returns => IDsResult, { complexity: 10 })
  async saveBlogEntries(
    @Arg('input', type => [BlogEntryInput]) input: BlogEntryInput[],
  ) {
    const ids = [] as string[]

    for (const entry of input) {
      const { id } = await this.saveBlogEntry(entry)

      ids.push(id)
    }

    return new IDsResult(ids)
  }
}
