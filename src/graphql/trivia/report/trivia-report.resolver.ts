import { Resolver, Mutation, Arg, ID, Query, Authorized, FieldResolver, Root } from 'type-graphql'
import { getManager } from 'typeorm'
import { TriviaReport } from './trivia-report.type'
import { TriviaReportInput } from './trivia-report.input'
import { TriviaQuestion } from '../question/trivia-question.type'
import { UserRoles } from '../../user/role/user-role.type'

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
    return getManager().find(TriviaReport)
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

  @FieldResolver(type => TriviaQuestion, { complexity: 5 })
  async question(
    @Root() report: TriviaReport,
  ) {
    return getManager().findOne(TriviaQuestion, report.questionId)
  }
}
