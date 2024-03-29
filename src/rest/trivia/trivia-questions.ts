import * as Router from '@koa/router'
import { getManager, getRepository } from 'typeorm'
import { Language } from '../../graphql/meta/language/language.type'
import { TriviaCategory } from '../../graphql/trivia/category/trivia-category.type'
import { TriviaQuestionLegacyInput } from '../../graphql/trivia/question/trivia-question.legacy.input'
import { TriviaQuestion } from '../../graphql/trivia/question/trivia-question.type'
import { TriviaReport } from '../../graphql/trivia/report/trivia-report.type'

export const router = new Router()

router.get('/trivia/questions', async ctx => {
  const exclude = ctx.query.exclude as string
  const include = ctx.query.include as string
  const submitters = ctx.query.submitters as string
  const verified = (ctx.query.verified ?? 'true' as string) === 'true'
  const disabled = (ctx.query.disabled ?? 'false' as string) === 'true'
  const shuffled = (ctx.query.shuffled ?? 'true' as string) === 'true'

  let query = getRepository(TriviaQuestion)
    .createQueryBuilder('question')
    .innerJoinAndSelect(TriviaCategory, 'category', 'question."categoryId" = category."id"')
    .innerJoinAndSelect(Language, 'language', 'question."languageId" = language."id"')
    .where('1 = 1')

  if (exclude) {
    const excludedCategories = exclude.slice(1, -1).split(",")

    query = query
      .andWhere('category."name" NOT IN (:...excludedCategories)', { excludedCategories })
  } else if (include) {
    const includedCategories = include.slice(1, -1).split(",")

    query = query
      .andWhere('category."name" IN (:...includedCategories)', { includedCategories })
  }

  if (submitters) {
    const includedSubmitters = submitters.slice(1, -1).split(",")

    query = query
      .andWhere('question."submitter" IN (:...includedSubmitters)', { includedSubmitters })
  }

  if (verified !== undefined) {
    query = query
      .andWhere('question."verified" = :verified', { verified })
      .andWhere('category."verified" = :verified', { verified })
  }

  if (disabled !== undefined) {
    query = query
      .andWhere('question."disabled" = :disabled', { disabled })
      .andWhere('category."disabled" = :disabled', { disabled })
  }

  if (shuffled === false) {
    query = query
      .addOrderBy('question."createdAt"', 'DESC')
  }

  let questions = await query.getRawMany()

  if (shuffled === true) {
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

router.post('/trivia/reports', async ctx => {
  const {
    questionId,
    user: submitter,
    message,
  } = ctx.request.body

  const report = new TriviaReport({
    questionId,
    message,
    submitter,
  })

  await getManager().save(TriviaReport, report)

  ctx.status = 204
})
