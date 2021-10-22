import * as Router from '@koa/router'
import { router as analyticsRouter } from './analytics/analytics-errors'
import { router as triviaRouter } from './trivia/trivia-questions'
import { router as blogRouter } from './blog/blog-entries'
import { router as isinRouter } from './stuff/isin-value'

export const router = new Router()

router
  .use(analyticsRouter.routes())
  .use(analyticsRouter.allowedMethods())
  .use(triviaRouter.routes())
  .use(triviaRouter.allowedMethods())
  .use(blogRouter.routes())
  .use(blogRouter.allowedMethods())
  .use(isinRouter.routes())
  .use(isinRouter.allowedMethods())
