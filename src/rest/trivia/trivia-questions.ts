import * as Router from '@koa/router'
import { getRepository } from 'typeorm'
import { Language } from '../../graphql/meta/language/language.type'
import { TriviaCategory } from '../../graphql/trivia/category/trivia-category.type'
import { TriviaQuestionLegacyInput } from '../../graphql/trivia/question/trivia-question.legacy.input'
import { TriviaQuestion } from '../../graphql/trivia/question/trivia-question.type'

export const router = new Router()

router.get('/trivia/questions', async ctx => {
  ctx.query.verified = ctx.query.verified ?? true
  ctx.query.disabled = ctx.query.disabled ?? false
  ctx.query.shuffled = ctx.query.shuffled ?? true

  let query = getRepository(TriviaQuestion)
    .createQueryBuilder('question')
    .innerJoinAndSelect(TriviaCategory, 'category', 'question."categoryId" = category."id"')
    .innerJoinAndSelect(Language, 'language', 'question."languageId" = language."id"')
    .where('1 = 1')

  if (ctx.query.exclude) {
    const excludedCategories = ctx.query.exclude.slice(1, -1).split(",")

    query = query
      .andWhere('category."name" NOT IN (:...excludedCategories)', { excludedCategories })
  } else if (ctx.query.include) {
    const includedCategories = ctx.query.include.slice(1, -1).split(",")

    query = query
      .andWhere('category."name" IN (:...includedCategories)', { includedCategories })
  }

  if (ctx.query.submitters) {
    const submitters = ctx.query.submitters.slice(1, -1).split(",")

    query = query
      .andWhere('question."submitter" IN (:...submitters)', { submitters })
  }

  if (ctx.query.verified !== undefined) {
    query = query
      .andWhere('question."verified" = :verified', { verified: Boolean(ctx.query.verified) })
      .andWhere('category."verified" = :verified', { verified: Boolean(ctx.query.verified) })
  }

  if (ctx.query.disabled !== undefined) {
    query = query
      .andWhere('question."disabled" = :disabled', { disabled: Boolean(ctx.query.disabled) })
      .andWhere('category."disabled" = :disabled', { disabled: Boolean(ctx.query.disabled) })
  }

  if (!Boolean(ctx.query.shuffled)) {
    query = query
      .addOrderBy('question."createdAt"', 'DESC')
  }

  let questions = await query.getRawMany()

  if (Boolean(ctx.query.shuffled)) {
    const shuffleInPlace = <T>(a: T[]): T[] => {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))

          ;[a[i], a[j]] = [a[j], a[i]]
      }

      return a
    }

    shuffleInPlace(questions)
  }

  if (ctx.query.count) {
    questions = questions.slice(0, Number(ctx.query.count))
  }

  ctx.response.type = 'application/json'
  ctx.response.body = questions.map(q => ({
    question: q['question_question'],
    answer: q['question_answer'],
    category: q['category_name'],
    language: q['language_name'],
    hint1: q['question_hint1'],
    hint2: q['question_hint2'],
    submitter: q['question_submitter'],
    // verified: q['question_verified'],
    // disabled: q['question_disabled'],
    // createdAt: q['question_createdAt'],
    // updatedAt: q['question_updatedAt'],
  } as TriviaQuestionLegacyInput))
})
