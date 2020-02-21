import { Resolver, Mutation, Arg, ID, Query, Args, Authorized, FieldResolver, Root, Ctx } from 'type-graphql'
import { getManager, In, getRepository, Equal } from 'typeorm'
import { TriviaQuestion } from './trivia-question.type'
import { TriviaQuestionInput } from './trivia-question.input'
import { TriviaCategory } from '../category/trivia-category.type'
import { Language } from '../../meta/language/language.type'
import { ConnectionOf, EdgeOf, ConnectionArgs } from '../../connection'
import { SearchAndSortArgs } from '../../search-and-sort'
import { TriviaQuestionLegacyInput } from './trivia-question.legacy.input'
import { CountResult } from '../../count.result'
import { TriviaReport } from '../report/trivia-report.type'
import { User, ExportableUser } from '../../user/user.type'
import selectConnection from '../../selectConnection'
import { assertUserAuthorization } from '../../check-authorization'
import { UserRoles } from '../../user/role/user-role.type'

export const TriviaQuestionConnection = ConnectionOf(TriviaQuestion)
export const TriviaQuestionEdge = EdgeOf(TriviaQuestion)

@Resolver(type => TriviaQuestion)
export class TriviaQuestionResolver {
  @Query(returns => TriviaQuestion, { nullable: true })
  async triviaQuestion(
    @Arg('id', type => ID) id: string,
  ) {
    return getManager().findOne(TriviaQuestion, id)
  }

  @Query(returns => TriviaQuestionConnection, { complexity: 10 })
  async triviaQuestions(
    @Ctx('currentUser') currentUser: ExportableUser | undefined,
    @Args() connectionArgs: ConnectionArgs,
    @Args() searchAndSortArgs: SearchAndSortArgs,
    @Arg('verified', type => Boolean, { nullable: true }) verified?: boolean,
    @Arg('disabled', type => Boolean, { nullable: true }) disabled = false,
    @Arg('reported', type => Boolean, { nullable: true }) reported?: boolean,
    @Arg('dangling', type => Boolean, { nullable: true }) dangling?: boolean,
  ) {
    return selectConnection(TriviaQuestion, connectionArgs, searchAndSortArgs, 'question', query => {
      if (verified !== undefined) {
        query = query
          .andWhere('question."verified" = :verified', { verified })
      }

      if (disabled !== undefined) {
        query = query
          .andWhere('question."disabled" = :disabled', { disabled })
      }

      if (reported !== undefined) {
        assertUserAuthorization(currentUser, [UserRoles.TRIVIA_ADMIN])

        query = query
          .andWhere(`${reported ? 'EXISTS' : 'NOT EXISTS'} ${query.subQuery().select('1').from(TriviaReport, 'report').where('report."questionId" = question."id"').getQuery()}`)
      }

      if (dangling !== undefined) {
        query = query
          .andWhere(`${query.subQuery().select('(NOT category."verified") OR (category."disabled")').from(TriviaCategory, 'category').where('question."categoryId" = category."id"').getQuery()} = :dangling`, { dangling })
      }

      return query
    })
  }

  @Mutation(returns => TriviaQuestion, { complexity: 5 })
  async saveTriviaQuestion(
    @Ctx('currentUser') currentUser: ExportableUser | undefined,
    @Arg('input') input: TriviaQuestionInput,
  ) {
    const { id, category, language, ...questionInput } = input

    if (id) {
      assertUserAuthorization(currentUser, [UserRoles.TRIVIA_ADMIN])
    }

    const question = new TriviaQuestion({
      id,
      ...questionInput,
      category: await getManager().findOne(TriviaCategory, category.id),
      language: await getManager().findOne(Language, language.id),
      updatedBy: currentUser && await getManager().findOne(User, currentUser.id),
    })

    return getManager().save(TriviaQuestion, question)
  }

  @Authorized(UserRoles.TRIVIA_ADMIN)
  @Mutation(returns => CountResult, { complexity: 5 })
  async verifyTriviaQuestions(
    @Arg('ids', type => [String]) ids: string[],
  ) {
    const questions = await getManager().find(TriviaQuestion, { id: In(ids) })

    for (const question of questions) {
      question.verified = true
    }

    await getManager().save(questions)

    return new CountResult(questions.length)
  }

  @Authorized(UserRoles.TRIVIA_ADMIN)
  @Mutation(returns => CountResult, { complexity: 5 })
  async removeTriviaQuestions(
    @Arg('ids', type => [String]) ids: string[],
  ) {
    const questions = await getManager().find(TriviaQuestion, { id: In(ids) })

    for (const question of questions) {
      question.disabled = true
    }

    await getManager().save(questions)

    return new CountResult(questions.length)
  }

  @Authorized(UserRoles.TRIVIA_ADMIN)
  @Mutation(returns => CountResult, { complexity: 5 })
  async categorizeTriviaQuestions(
    @Arg('ids', type => [String]) ids: string[],
    @Arg('categoryId', type => String) categoryId: string,
  ) {
    const category = await getManager().findOneOrFail(TriviaCategory, categoryId)
    const questions = await getManager().find(TriviaQuestion, { id: In(ids) })

    for (const question of questions) {
      question.category = category
    }

    await getManager().save(questions)

    return new CountResult(questions.length)
  }

  @Authorized(UserRoles.ADMIN)
  @Mutation(returns => CountResult, { complexity: 5 })
  async importLegacyTriviaQuestions(
    @Arg('input', type => [TriviaQuestionLegacyInput]) input: TriviaQuestionLegacyInput[],
  ) {
    for (const legacyQuestion of input) {
      const { category: categoryName, language: languageName, ...questionInput } = legacyQuestion
      const question = new TriviaQuestion(questionInput)

      let category = await getManager().findOne(TriviaCategory, { name: Equal(categoryName) })
      let language = await getManager().findOne(Language, { name: Equal('english') })

      if (!category) {
        category = new TriviaCategory({ name: categoryName })
        category = await getManager().save(TriviaCategory, category)
      }

      if (!language) {
        language = new Language({ name: 'english' })
        language = await getManager().save(Language, language)
      }

      question.category = category
      question.language = language

      await getManager().save(TriviaQuestion, question)
    }

    return new CountResult(input.length)
  }

  @FieldResolver(type => TriviaCategory, { complexity: 5 })
  async category(
    @Root() question: TriviaQuestion,
  ) {
    return getManager().findOne(TriviaCategory, question.categoryId)
  }

  @FieldResolver(type => Language, { complexity: 5 })
  async language(
    @Root() question: TriviaQuestion,
  ) {
    return getManager().findOne(Language, question.languageId)
  }

  @Authorized(UserRoles.TRIVIA_ADMIN)
  @FieldResolver(type => User, { nullable: true, complexity: 5 })
  async submitterUser(
    @Root() question: TriviaQuestion,
  ) {
    return getManager().findOne(User, question.submitterUserId)
  }

  @Authorized(UserRoles.TRIVIA_ADMIN)
  @FieldResolver(type => User, { nullable: true, complexity: 5 })
  async updatedBy(
    @Root() question: TriviaQuestion,
  ) {
    return getManager().findOne(User, question.updatedById)
  }

  @Authorized(UserRoles.TRIVIA_ADMIN)
  @FieldResolver(type => [TriviaReport], { nullable: true, complexity: 5 })
  async reports(
    @Root() question: TriviaQuestion,
  ) {
    // return getManager().find(TriviaReport, {
    //   where: { question: Equal(question) },
    // })
    return getRepository(TriviaReport)
      .createQueryBuilder('report')
      .where('report."questionId" = :questionId', { questionId: question.id })
      .getMany()
  }
}
