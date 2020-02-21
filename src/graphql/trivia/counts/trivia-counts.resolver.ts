import { Resolver, Query, Authorized } from 'type-graphql'
import { TriviaCounts } from './trivia-counts.type'
import { UserRoles } from '../../user/role/user-role.type'
import { getManager } from 'typeorm'
import { TriviaQuestion } from '../question/trivia-question.type'
import { TriviaReport } from '../report/trivia-report.type'
import { TriviaCategory } from '../category/trivia-category.type'

const countQuestions = ({ verified, reported, dangling }: { verified?: boolean, reported?: boolean, dangling?: boolean } = {}) => {
  let query = getManager()
    .createQueryBuilder()
    .select('count(*) AS count')
    .from(TriviaQuestion, 'question')
    .where('question."disabled" = false')

  if (verified !== undefined) {
    query = query
      .andWhere('question."verified" = :verified', { verified })
  }

  if (reported !== undefined) {
    query = query
      .andWhere(`${reported ? 'EXISTS' : 'NOT EXISTS'} ${query.subQuery().select('1').from(TriviaReport, 'report').where('report."questionId" = question."id"').getQuery()}`)
  }

  if (dangling !== undefined) {
    query = query
      .andWhere(`${query.subQuery().select('(NOT category."verified") OR (category."disabled")').from(TriviaCategory, 'category').where('question."categoryId" = category."id"').getQuery()} = :dangling`, { dangling })
  }

  return query.getRawOne()
    .then(r => r.count as number)
}

const countUnverifiedQuestions = () =>
  countQuestions({ verified: false, dangling: false })

const countCategories = ({ verified }: { verified?: boolean } = {}) => {
  let query = getManager()
    .createQueryBuilder()
    .select('count(*) AS count')
    .from(TriviaCategory, 'category')
    .where('category."disabled" = false')

  if (verified !== undefined) {
    query = query
      .andWhere('category."verified" = :verified', { verified })
  }

  return query.getRawOne()
    .then(r => r.count as number)
}

const countUnverifiedCategories = () =>
  countCategories({ verified: false })

const countReports = () => {
  let query = getManager()
    .createQueryBuilder()
    .select('count(*) AS count')
    .from(TriviaReport, 'report')
    .where('1 = 1')

  return query.getRawOne()
    .then(r => r.count as number)
}

const countReportedQuestions = () =>
  countQuestions({ reported: true })

const countDanglingQuestions = () =>
  countQuestions({ dangling: true })

@Resolver(type => TriviaCounts)
export class TriviaCountsResolver {
  @Authorized(UserRoles.TRIVIA_ADMIN)
  @Query(returns => TriviaCounts, { complexity: 10 })
  async triviaCounts() {
    const [
      questionsCount,
      unverifiedQuestionsCount,
      categoriesCount,
      unverifiedCategoriesCount,
      reportsCount,
      reportedQuestionsCount,
      danglingQuestionsCount,
    ] = await Promise.all([
      countQuestions(),
      countUnverifiedQuestions(),
      countCategories(),
      countUnverifiedCategories(),
      countReports(),
      countReportedQuestions(),
      countDanglingQuestions(),
    ])

    return new TriviaCounts({
      questionsCount,
      unverifiedQuestionsCount,
      categoriesCount,
      unverifiedCategoriesCount,
      reportsCount,
      reportedQuestionsCount,
      danglingQuestionsCount,
    })
  }
}
