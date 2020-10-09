import * as Router from '@koa/router'
import { getManager } from 'typeorm'
import { AnalyticsError } from '../../graphql/analytics/errors/analytics-error.type'

interface AnalyticsErrorInput {
  type: string
  age: number
  url: string
  user_agent: string
  body: { [key: string]: unknown }
}

export const router = new Router()

router.post('/analytics/errors', async ctx => {
  const {
    type,
    url,
    user_agent,
    body,
  } = ctx.body as AnalyticsErrorInput

  await getManager()
    .save(new AnalyticsError({
      type,
      url,
      userAgent: user_agent,
      body,
    }))
})
