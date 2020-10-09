import * as Router from '@koa/router'
import { router as analyticsRouter } from './analytics/analytics-errors'
import { router as triviaRouter } from './trivia/trivia-questions'

export const router = new Router()

router
  .use(analyticsRouter.routes())
  .use(analyticsRouter.allowedMethods())
  .use(triviaRouter.routes())
  .use(triviaRouter.allowedMethods())
