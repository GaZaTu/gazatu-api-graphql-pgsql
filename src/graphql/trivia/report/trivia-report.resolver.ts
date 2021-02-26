import { Resolver, Mutation, Arg, ID, Query, Authorized, FieldResolver, Root } from 'type-graphql'
import { getManager, In } from 'typeorm'
import { TriviaReport } from './trivia-report.type'
import { TriviaReportInput } from './trivia-report.input'
import { TriviaQuestion } from '../question/trivia-question.type'
import { UserRoles } from '../../user/role/user-role.type'
import { CountResult } from '../../count.result'

@Resolver(type => TriviaReport)
export class TriviaReportResolver {
  @Authorized(UserRoles.TRIVIA_ADMIN)
  @Query(returns => TriviaReport, { nullable: true, complexity: 5 })
  async triviaReport(
    @Arg('id', type => ID) id: string,
  ) {
    return getManager().findOne(TriviaReport, id)
  }

  @Authorized(UserRoles.TRIVIA_ADMIN)
  @Query(returns => [TriviaReport], { complexity: 5 })
  async triviaReports() {
    return getManager().find(TriviaReport, { order: { updatedAt: 'DESC' }})
  }

  @Mutation(returns => TriviaReport, { complexity: 5 })
  async reportTriviaQuestion(
    @Arg('input') input: TriviaReportInput,
  ) {
    const { questionId, ...reportInput } = input
    const question = await getManager().findOne(TriviaQuestion, questionId)
    const report = new TriviaReport({
      ...reportInput,
      question,
    })

    return getManager().save(TriviaReport, report)
  }

  @Authorized(UserRoles.TRIVIA_ADMIN)
  @Mutation(returns => CountResult, { complexity: 5 })
  async removeTriviaReports(
    @Arg('ids', type => [ID]) ids: string[],
  ) {
    await getManager().remove(
      await getManager().find(TriviaReport, { id: In(ids) })
    )

    return new CountResult(ids.length)
  }

  @FieldResolver(type => TriviaQuestion, { complexity: 5 })
  async question(
    @Root() report: TriviaReport,
  ) {
    return getManager().findOne(TriviaQuestion, report.questionId)
  }
}
