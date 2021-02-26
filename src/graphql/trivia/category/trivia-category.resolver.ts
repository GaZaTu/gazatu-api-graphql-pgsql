import { Resolver, Mutation, Arg, ID, Query, Ctx, Authorized, FieldResolver, Root } from 'type-graphql'
import { getManager, In, getRepository, Equal } from 'typeorm'
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
    @Arg('verified', type => Boolean, { nullable: true }) verified: boolean | null,
    @Arg('disabled', type => Boolean, { nullable: true }) disabled: boolean | null,
  ) {
    disabled ??= false

    let query = getRepository(TriviaCategory)
      .createQueryBuilder('category')
      .select()
      .where('1 = 1')
      .orderBy('name', 'ASC')

    if (verified !== null) {
      query = query
        .andWhere('category."verified" = :verified', { verified })
    }

    if (disabled !== null) {
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
      id: id ?? undefined,
      ...categoryInput,
    })

    return getManager().save(TriviaCategory, category)
  }

  @Authorized(UserRoles.TRIVIA_ADMIN)
  @Mutation(returns => CountResult, { complexity: 5 })
  async verifyTriviaCategories(
    @Arg('ids', type => [ID]) ids: string[],
  ) {
    const categories = await getManager().find(TriviaCategory, { id: In(ids) })

    for (const category of categories) {
      category.verified = true
    }

    await getManager().save(categories)

    return new CountResult(categories.length)
  }

  @Authorized(UserRoles.TRIVIA_ADMIN)
  @Mutation(returns => CountResult, { complexity: 5 })
  async removeTriviaCategories(
    @Arg('ids', type => [ID]) ids: string[],
  ) {
    const categories = await getManager().find(TriviaCategory, { id: In(ids) })

    for (const category of categories) {
      category.disabled = true
    }

    await getManager().save(categories)

    return new CountResult(categories.length)
  }

  @Authorized(UserRoles.TRIVIA_ADMIN)
  @Mutation(returns => CountResult, { complexity: 5 })
  async mergeTriviaCategoriesInto(
    @Arg('ids', type => [ID]) ids: string[],
    @Arg('targetId', type => ID) targetId: string,
  ) {
    if (ids.includes(targetId)) {
      return new CountResult(0)
    }

    const targetCategory = await getManager().findOneOrFail(TriviaCategory, targetId)
    const categories = await getManager().find(TriviaCategory, { id: In(ids) })

    for (const category of categories) {
      // const questions = await getManager().find(TriviaQuestion, { category: Equal(category) })

      const questions = await getRepository(TriviaQuestion)
        .createQueryBuilder('question')
        .where('question."categoryId" = :categoryId', { categoryId: category.id })
        .getMany()

      for (const question of questions) {
        question.category = targetCategory
      }

      await getManager().save(questions)
    }

    await getManager().remove(categories)

    return new CountResult(categories.length)
  }

  @Authorized(UserRoles.TRIVIA_ADMIN)
  @FieldResolver(type => [TriviaQuestion], { nullable: true, complexity: 5 })
  async questions(
    @Root() category: TriviaCategory,
  ) {
    // return getManager().find(TriviaQuestion, {
    //   where: { category: Equal(category), disabled: false },
    // })
    return getRepository(TriviaQuestion)
      .createQueryBuilder('question')
      .where('question."categoryId" = :categoryId', { categoryId: category.id })
      .andWhere('question."disabled" = false')
      .getMany()
  }

  @Authorized(UserRoles.TRIVIA_ADMIN)
  @FieldResolver(type => Number, { complexity: 5 })
  async questionsCount(
    @Root() category: TriviaCategory,
  ) {
    // return getManager().count(TriviaQuestion, {
    //   where: { category: Equal(category), disabled: false },
    // })
    return getRepository(TriviaQuestion)
      .createQueryBuilder('question')
      .select('count(*) AS count')
      .where('question."categoryId" = :categoryId', { categoryId: category.id })
      .andWhere('question."disabled" = false')
      .getRawOne()
      .then(r => Number(r.count))
  }
}
