import { Resolver, Query, Authorized } from 'type-graphql'
import { TriviaCounts } from './trivia-counts.type'
import { UserRoles } from '../../user/role/user-role.type'
import { getManager, QueryBuilder, SelectQueryBuilder } from 'typeorm'
import { TriviaQuestion } from '../question/trivia-question.type'
import { TriviaReport } from '../report/trivia-report.type'
import { TriviaCategory } from '../category/trivia-category.type'
import { SingleEntity } from '../../meta/single.type'

const queryEx = <Entity>(query: QueryBuilder<Entity>) => {
  const param = (paramValue: unknown) => {
    const paramName = Math.random().toString(36).substr(2, 10)
    query.setParameter(paramName, paramValue)
    return paramName
  }

  return {
    param,
  }
}

const questionsCountSelector = ({ verified, reported, dangling }: { verified?: boolean, reported?: boolean, dangling?: boolean } = {}) =>
  <Entity>(query: SelectQueryBuilder<Entity>) =>
    query.subQuery()
      .select('count(*)')
      .from(TriviaQuestion, 'question')
      .where('question."disabled" = false')
      .andWhere(query => {
        if (verified !== undefined) {
          return `question."verified" = :${queryEx(query).param(verified)}`
        } else {
          return '1 = 1'
        }
      })
      .andWhere(query => {
        if (reported !== undefined) {
          return `(EXISTS ${
            query.subQuery()
              .select('1')
              .from(TriviaReport, 'report')
              .where('report."questionId" = question."id"')
              .getQuery()
            }) = :${queryEx(query).param(reported)}`
        } else {
          return '1 = 1'
        }
      })
      .andWhere(query => {
        if (dangling !== undefined) {
          return `${
            query.subQuery()
              .select('(NOT category."verified") OR (category."disabled")')
              .from(TriviaCategory, 'category')
              .where('category."id" = question."categoryId"')
              .getQuery()
            } = :${queryEx(query).param(dangling)}`
        } else {
          return '1 = 1'
        }
      })

const unverifiedQuestionsCountSelector = () =>
  questionsCountSelector({ verified: false, dangling: false })

const categoriesCountSelector = ({ verified }: { verified?: boolean } = {}) =>
  <Entity>(query: SelectQueryBuilder<Entity>) =>
    query.subQuery()
      .select('count(*)')
      .from(TriviaCategory, 'category')
      .where('category."disabled" = false')
      .andWhere(query => {
        if (verified !== undefined) {
          return `category."verified" = :${queryEx(query).param(verified)}`
        } else {
          return '1 = 1'
        }
      })

const unverifiedCategoriesCountSelector = () =>
  categoriesCountSelector({ verified: false })

const reportsCountSelector = () =>
  <Entity>(query: SelectQueryBuilder<Entity>) =>
    query.subQuery()
      .select('count(*)')
      .from(TriviaReport, 'report')

const reportedQuestionsCountSelector = () =>
  questionsCountSelector({ reported: true })

const danglingQuestionsCountSelector = () =>
  questionsCountSelector({ dangling: true })

@Resolver(type => TriviaCounts)
export class TriviaCountsResolver {
  @Authorized(UserRoles.TRIVIA_ADMIN)
  @Query(returns => TriviaCounts, { complexity: 10 })
  async triviaCounts() {
    return new TriviaCounts(
      await getManager()
        .createQueryBuilder()
        .addSelect(questionsCountSelector(), 'questionsCount')
        .addSelect(unverifiedQuestionsCountSelector(), 'unverifiedQuestionsCount')
        .addSelect(categoriesCountSelector(), 'categoriesCount')
        .addSelect(unverifiedCategoriesCountSelector(), 'unverifiedCategoriesCount')
        .addSelect(reportsCountSelector(), 'reportsCount')
        .addSelect(reportedQuestionsCountSelector(), 'reportedQuestionsCount')
        .addSelect(danglingQuestionsCountSelector(), 'danglingQuestionsCount')
        .from(SingleEntity, 'void')
        .getRawOne()
    )
  }
}
