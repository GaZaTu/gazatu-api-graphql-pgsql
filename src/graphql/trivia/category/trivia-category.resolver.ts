import { Resolver, Mutation, Arg, ID, Query, Ctx, Authorized, FieldResolver, Root } from 'type-graphql'
import { getManager, In, getRepository } from 'typeorm'
import { TriviaCategory } from './trivia-category.type'
import { TriviaCategoryInput } from './trivia-category.input'
import { assertUserAuthorization } from '../../check-authorization'
import { UserRoles } from '../../user/role/user-role.type'
import { ExportableUser } from '../../user/user.type'
import { CountResult } from '../../count.result'
import { TriviaQuestion } from '../question/trivia-question.type'

@Resolver(type => TriviaCategory)
export class TriviaCategoryResolver {
  @Query(returns => TriviaCategory, { nullable: true, complexity: 5 })
  async triviaCategory(
    @Arg('id', type => ID) id: string,
  ) {
    return getManager().findOne(TriviaCategory, id)
  }

  @Query(returns => [TriviaCategory], { complexity: 5 })
  async triviaCategories(
    @Arg('verified', type => Boolean, { nullable: true }) verified?: boolean,
    @Arg('disabled', type => Boolean, { nullable: true }) disabled = false,
  ) {
    let query = getRepository(TriviaCategory)
      .createQueryBuilder('category')
      .select()
      .where('1 = 1')
      .orderBy('name', 'ASC')

    if (verified !== undefined) {
      query = query
        .andWhere('category."verified" = :verified', { verified })
    }

    if (disabled !== undefined) {
      query = query
        .andWhere('category."disabled" = :disabled', { disabled })
    }

    return query.getMany()
  }

  @Mutation(returns => TriviaCategory, { complexity: 5 })
  async saveTriviaCategory(
    @Ctx('currentUser') currentUser: ExportableUser | undefined,
    @Arg('input') input: TriviaCategoryInput,
  ) {
    const { id, ...categoryInput } = input

    if (id) {
      assertUserAuthorization(currentUser, [UserRoles.TRIVIA_ADMIN])
    }

    const category = new TriviaCategory({
      id,
      ...categoryInput,
    })

    return getManager().save(TriviaCategory, category)
  }

  @Authorized(UserRoles.TRIVIA_ADMIN)
  @Mutation(returns => CountResult, { complexity: 5 })
  async verifyTriviaCategories(
    @Arg('ids', type => [String]) ids: string[],
  ) {
    const categories = await getManager().find(TriviaCategory, { id: In(ids) })

    for (const category of categories) {
      category.verified = true

      await getManager().save(category)
    }

    return new CountResult(categories.length)
  }

  @Authorized(UserRoles.TRIVIA_ADMIN)
  @Mutation(returns => CountResult, { complexity: 5 })
  async removeTriviaCategories(
    @Arg('ids', type => [String]) ids: string[],
  ) {
    const categories = await getManager().find(TriviaCategory, { id: In(ids) })

    for (const category of categories) {
      category.disabled = true

      await getManager().save(category)
    }

    return new CountResult(categories.length)
  }

  @Authorized(UserRoles.TRIVIA_ADMIN)
  @FieldResolver(type => [TriviaQuestion], { nullable: true, complexity: 5 })
  async questions(
    @Root() category: TriviaCategory,
  ) {
    return getManager().find(TriviaQuestion, {
      where: { category },
    })
  }
}
