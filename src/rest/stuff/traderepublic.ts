import * as WebSocket from 'ws'

interface Subscription {
  unsubscribe(): void
}

interface Observable<T> {
  subscribe(next: (value: T) => unknown): Subscription
}

export type TraderepublicInstrumentSub = {
  type: 'instrument'
  id: string
  jurisdiction: string
}

export type TraderepublicInstrumentData = {
  active: boolean
  exchangeIds: string[]
  exchanges: {
    slug: string
    active: boolean
    nameAtExchange: string
    symbolAtExchange: string
    firstSeen: number
    lastSeen: number
    firstTradingDay: number | null
    tradingTimes: unknown
    fractionalTrading: unknown
  }[]
  jurisdictions: {
    [key: string]: {
      active: boolean
      kidLink: string
      kidRequired: boolean
      savable: boolean
      fractionalTradingAllowed: boolean
    }
  }
  dividends: unknown[]
  splits: unknown[]
  cfi: string
  name: string
  typeId: string
  wkn: string
  legacyTypeChar: string
  isin: string
  priceFactory: number
  shortName: string
  homeSymbol: string
  intlSymbol: string
  homeNsin: string
  tags: {
    type: string
    id: string
    name: string
    icon: string
  }[]
  derivativeProductCount: unknown
  derivativeProductCategories: unknown[]
  company: {
    name: string
    description: string | null
    ipoDate: number | null
    countryOfOrigin: string | null
  }
  marketCap: {
    value: string | null
    currencyId: string | null
  }
  lastDividend: number | null
  shareType: string | null
  custodyType: string | null
  kidRequired: boolean
  kidLink: string
  tradable: boolean
  fundInfo: {
    ter: string
    underlyingClass: string
    currency: string | null
    market: string | null
    method: string | null
    useOfProfits: string
    index: string | null
    ucits: boolean
    legalFormType: string
    domicile: string
    launchDate: string
    useOfProfitsDisplayName: string
  } | null
  derivativeInfo: {
    categoryType: string
    productCategoryName: string
    productGroupType: string
    knocked: boolean
    issuerCountry: string
    emissionDate: string
    underlying: {
      name: string
      shortName: string
      isin: string
      available: boolean
    }
    properties: {
      strike: number
      barrier: number | null
      cap: null
      factor: null
      currency: string
      size: number
      expiry: number | null
      maturity: number | null
      exerciseType: string
      settlementType: string
      optionType: string
      quoteType: string
      firstTradingDay: string
      lastTradingDay: string | null
      delta: number | null
      leverage: number
    }
    mifid: {
      entryCost: number
      exitCost: number
      ongoingCostsExpected: number
      ongoingCostsAccumulated: number
      costNotation: string
    }
  } | null
  targetMarket: {
    investorType: string
    investorExperience: string
  }
  savable: boolean
  fractionalTradingAllowed: boolean
  issuer: string
  issuerDisplayName: string
  notionalCurrency: string
  additionalBuyWarning: string | null
  warningMessage: string | null
  noTradeVolume: boolean
  additionalBuyWarnings: {
    [lang: string]: string
  }
  warningMessages: {
    [lang: string]: string
  }
}

export type TraderepublicHomeInstrumentExchangeSub = {
  type: 'homeInstrumentExchange'
  id: string
}

export type TraderepublicHomeInstrumentExchangeData = {
  exchangeId: string
  exchange: {
    id: string
    name: string
    timeZoneId: string
  }
  currency: {
    id: string
    name: string
  }
  orderModes: string[]
  orderExpiries: string[]
  open: boolean
  priceSteps: unknown[]
  openTimeOffsetMillis: number
  closeTimeOffsetMillis: number
  maintenanceWindow: unknown
}

export type TraderepublicTickerSub = {
  type: 'ticker'
  id: string
  exchange: string
}

export type TraderepublicTickerPrice = {
  time: number
  price: number
  size: number
}

export type TraderepublicTickerData = {
  bid: TraderepublicTickerPrice
  ask: TraderepublicTickerPrice
  last: TraderepublicTickerPrice
  pre: TraderepublicTickerPrice
  open: TraderepublicTickerPrice
  qualityId: 'realtime'
  leverage: unknown
  delta: unknown
}

export type TraderepublicAggregateHistoryLightSub = {
  type: 'aggregateHistoryLight'
  id: string
  exchange: string
  range: `${number}${'d' | 'w' | 'm' | 'y'}`
}

export type TraderepublicAggregateHistoryLightData = {
  expectedClosingTime: number
  aggregates: {
    time: number
    open: number
    high: number
    low: number
    close: number
    volume: 0
    adjValue: number
  }[]
  resolution: number
  lastAggregateEndTime: number
}

export class TraderepublicWebsocket {
  static URI = 'wss://api.traderepublic.com/' as const
  static CLIENT_INFO = {
    locale: 'en',
    platformId: 'undefined',
    platformVersion: 'undefined',
    clientId: 'app.traderepublic.com',
    clientVersion: '5582',
  } as const

  private _subscriptions = new Map<number, { sub: any, cb: (payload: any) => void }>()
  private _counter = 24
  private _socket = undefined as undefined | WebSocket
  private _echo = 0 as any
  private _connected = false
  private _connecting = false
  private _resolveConnected = () => { }
  private _connectingDone = new Promise<void>(resolve => this._resolveConnected = resolve)

  constructor(
    private _jurisdiction: string,
  ) { }

  private _send(reqKind: 'connect' | 'sub' | 'unsub' | 'echo', number: number, payload?: any) {
    const str = `${reqKind} ${number} ${payload ? JSON.stringify(payload) : ''}`

    this._socket?.send(str.trim())
  }

  // sub 703 {"type":"neonSearch","data":{"q":"TSLA","page":1,"pageSize":3,"filter":[{"key":"type","value":"stock"},{"key":"jurisdiction","value":"DE"}]}}
  // 703 A {"results":[{"isin":"US88160R1014","name":"Tesla","tags":[{"type":"country","id":"US","name":"USA"},{"type":"index","id":"nasdaq","name":"NASDAQ"},{"type":"index","id":"sp500","name":"SP500"},{"type":"sector","id":"automobiles","name":"Vehicles"},{"type":"attribute","id":"savable","name":"Savings Plan"}],"type":"instrument","subtitle":null,"derivativeProductCategories":["vanillaWarrant"]},{"isin":"BMG9108L1735","name":"Tsakos Energy","tags":[{"type":"country","id":"US","name":"USA"},{"type":"sector","id":"transportation","name":"Transportation"}],"type":"instrument","subtitle":null,"derivativeProductCategories":[]}],"resultCount":2}

  // sub 704 {"type":"neonSearch","data":{"q":"TSLA","page":1,"pageSize":3,"filter":[{"key":"type","value":"fund"},{"key":"jurisdiction","value":"DE"}]}}
  // 704 A {"results":[],"resultCount":0}

  private _sub(sub: TraderepublicInstrumentSub): Observable<TraderepublicInstrumentData>
  private _sub(sub: TraderepublicHomeInstrumentExchangeSub): Observable<TraderepublicHomeInstrumentExchangeData>
  private _sub(sub: TraderepublicTickerSub): Observable<TraderepublicTickerData>
  private _sub(sub: TraderepublicAggregateHistoryLightSub): Observable<TraderepublicAggregateHistoryLightData>
  private _sub(sub: TraderepublicInstrumentSub | TraderepublicHomeInstrumentExchangeSub | TraderepublicTickerSub | TraderepublicAggregateHistoryLightSub): Observable<TraderepublicInstrumentData | TraderepublicHomeInstrumentExchangeData | TraderepublicTickerData | TraderepublicAggregateHistoryLightData> {
    return {
      subscribe: (next: (data: any) => unknown) => {
        if (sub.type === 'ticker' || sub.type === 'aggregateHistoryLight') {
          sub.id = `${sub.id}.${sub.exchange}`
        }

        const number = ++this._counter

        this._subscriptions.set(number, {
          sub,
          cb: payload => {
            next(payload)
          },
        })

        if (this._connected) {
          this._send('sub', number, sub)
        }

        return {
          unsubscribe: () => {
            this._send('unsub', number)

            this._subscriptions.delete(number)
          },
        }
      },
    }
  }

  instrument(isin: string, jurisdiction: string = this._jurisdiction) {
    return new Promise<TraderepublicInstrumentData>(resolve => {
      const sub = this._sub({
        type: 'instrument',
        id: isin,
        jurisdiction,
      }).subscribe(value => {
        sub.unsubscribe()
        resolve(value)
      })
    })
  }

  exchange(isin: string | TraderepublicInstrumentData) {
    return new Promise<TraderepublicHomeInstrumentExchangeData>(resolve => {
      if (typeof isin === 'object') {
        isin = isin.isin
      }

      const sub = this._sub({
        type: 'homeInstrumentExchange',
        id: isin,
      }).subscribe(value => {
        sub.unsubscribe()
        resolve(value)
      })
    })
  }

  ticker(isin: string | TraderepublicInstrumentData, exchange?: string | TraderepublicHomeInstrumentExchangeData) {
    if (typeof isin === 'object') {
      exchange = isin.exchangeIds[0]
      isin = isin.isin
    }

    if (typeof exchange === 'object') {
      exchange = exchange.exchangeId
    }

    return this._sub({
      type: 'ticker',
      id: isin,
      exchange: exchange!,
    })
  }

  aggregateHistoryLight(isin: string | TraderepublicInstrumentData, range: TraderepublicAggregateHistoryLightSub['range'], exchange?: string | TraderepublicHomeInstrumentExchangeData) {
    return new Promise<TraderepublicAggregateHistoryLightData>(resolve => {
      if (typeof isin === 'object') {
        exchange = isin.exchangeIds[0]
        isin = isin.isin
      }

      if (typeof exchange === 'object') {
        exchange = exchange.exchangeId
      }

      const sub = this._sub({
        type: 'aggregateHistoryLight',
        id: isin,
        exchange: exchange!,
        range,
      }).subscribe(value => {
        sub.unsubscribe()
        resolve(value)
      })
    })
  }

  async connect() {
    if (this._connected) {
      return
    }

    if (this._connecting) {
      await this._connectingDone
      return
    }

    this._connecting = true
    this._socket = new WebSocket(TraderepublicWebsocket.URI)

    await new Promise<unknown>((resolve, reject) => {
      this._socket!.onerror = reject
      this._socket!.onopen = resolve
    })

    await new Promise<void>((resolve, reject) => {
      this._socket!.onerror = reject
      this._socket!.onmessage = message => {
        const messageString = message.data.toString('utf-8')

        if (messageString === 'connected') {
          resolve()
        } else {
          const regex = /(\d+) A ?(.*)/
          const match = regex.exec(messageString)

          if (match) {
            const [, number, payload] = match

            const subscription = this._subscriptions.get(Number(number))
            if (subscription) {
              subscription.cb(JSON.parse(payload))
            }
          }
        }
      }

      this._send('connect', 22, TraderepublicWebsocket.CLIENT_INFO)
    })

    this._socket.onerror = console.error
    this._socket.onclose = ev => {
      this._connected = false

      if (!ev.wasClean) {
        this.close()
        this.connect()
      }

      if (!this.hasSubscriptions) {
        this._counter = 24
      }
    }

    this._echo = setInterval(() => {
      this._send('echo', Math.floor(new Date().getTime() / 1000))
    }, 5000)

    for (const [number, { sub }] of this._subscriptions) {
      this._send('sub', number, sub)
    }

    this._connecting = false
    this._connected = true
    this._resolveConnected()
    this._connectingDone = new Promise<void>(resolve => this._resolveConnected = resolve)

    if (process.env.NODE_ENV !== 'production' && !!globalThis.window) {
      (window as any).trwsSub = (sub: any) =>
        this._sub(sub).subscribe(console.log)
    }
  }

  close() {
    clearInterval(this._echo)

    if (this._socket?.readyState === WebSocket.OPEN) {
      this._socket.close()
    }
  }

  get connected() {
    return this._connected
  }

  get hasSubscriptions() {
    return this._subscriptions.size > 0
  }

  get active() {
    return this.connected && this.hasSubscriptions
  }
}
