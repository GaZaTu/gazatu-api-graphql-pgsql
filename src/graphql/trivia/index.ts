import { TriviaQuestionResolver } from './question/trivia-question.resolver'
import { TriviaCategoryResolver } from './category/trivia-category.resolver'
import { TriviaReportResolver } from './report/trivia-report.resolver'
import { TriviaStatisticsResolver } from './statistics/trivia-statistics.resolver'
import { TriviaCountsResolver } from './counts/trivia-counts.resolver'

const resolvers = [
  TriviaQuestionResolver,
  TriviaCategoryResolver,
  TriviaReportResolver,
  TriviaStatisticsResolver,
  TriviaCountsResolver,
]

export default resolvers
