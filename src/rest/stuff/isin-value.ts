import * as Router from '@koa/router'
import { TraderepublicTickerData, TraderepublicWebsocket } from './traderepublic'

export const router = new Router()

const socket = new TraderepublicWebsocket('DE')
let timeout = undefined as any

router.get('/stuff/isin-value/:isin', async ctx => {
  let isin = ctx.params.isin as string
  if (isin.length !== 12) {
    ctx.throw(400)
  }

  await socket.connect()
  clearTimeout(timeout)
  timeout = setTimeout(() => {
    socket.close()
  }, 60000)

  const instrument = await socket.instrument(isin)

  const data = await new Promise<TraderepublicTickerData>(resolve => {
    const sub = socket.ticker(instrument).subscribe(data => {
      sub.unsubscribe()
      resolve(data)
    })
  })

  ctx.response.type = 'application/json'
  ctx.response.body = {
    shortName: instrument.shortName,
    bidPrice: data.bid.price,
  }
})
