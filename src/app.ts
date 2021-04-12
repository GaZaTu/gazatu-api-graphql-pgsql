import * as http from 'http'
import * as http2 from 'http2'
import * as Koa from 'koa'
import * as cors from '@koa/cors'
import * as jsonError from 'koa-json-error'
import * as bodyparser from 'koa-bodyparser'
import * as logger from 'koa-logger'
import * as config from 'config'
import * as gql from 'graphql'
import 'reflect-metadata'
import buildGraphQLSchema from './graphql'
import { Connection, createConnection, getManager, getRepository, Equal } from 'typeorm'
// import { getComplexity, fieldExtensionsEstimator, simpleEstimator } from 'graphql-query-complexity'
import { SubscriptionServer } from 'subscriptions-transport-ws'
import { Context } from './graphql/context'
import { verifyJwt } from './graphql/jwt'
import { User } from './graphql/user/user.type'
import normalizeVariablesForOperationDefinitions from './graphql/normalizeVariablesForOperationDefinitions'
import { TriviaQuestion } from './graphql/trivia/question/trivia-question.type'
import { TriviaCategory } from './graphql/trivia/category/trivia-category.type'
import { TriviaQuestionLegacyInput } from './graphql/trivia/question/trivia-question.legacy.input'
import { Language } from './graphql/meta/language/language.type'
import './graphql/dataloader-typeorm'
import { readFileSync } from 'fs'
import { router } from './rest'

function koaGraphQLMiddleware(schema: gql.GraphQLSchema, contextValue?: (ctx: Koa.Context) => unknown): Koa.Middleware {
  return async (ctx, next) => {
    if (ctx.path === '/graphql' && ctx.method === 'POST') {
      if (!ctx.request.body?.query) {
        ctx.status = 404
        return
      }

      const document = gql.parse(ctx.request.body.query)

      if (ctx.request.body.variables) {
        normalizeVariablesForOperationDefinitions(schema, document.definitions, ctx.request.body.variables)
      }

      // const complexity = getComplexity({
      //   query: document,
      //   schema,
      //   variables: ctx.request.body.variables,
      //   estimators: [fieldExtensionsEstimator(), simpleEstimator({ defaultComplexity: 1 })],
      // })

      // console.log('complexity', complexity)

      // if (complexity > 100) {
      //   throw Object.assign(new Error('GraphQL-Query complexity > 100'), { code: 400 })
      // }

      const result = await gql.execute({
        schema,
        document,
        operationName: ctx.request.body.operationName,
        variableValues: ctx.request.body.variables,
        contextValue: contextValue && await contextValue(ctx),
      })

      ctx.response.type = 'application/json'
      ctx.response.body = result
    }

    return next()
  }
}

function applyGraphQLLogger(schema: gql.GraphQLSchema) {
  for (const type of Object.values(schema.getTypeMap())) {
    if (!type.name.startsWith('__') && type instanceof gql.GraphQLObjectType) {
      for (const field of Object.values(type.getFields())) {
        if (field.resolve) {
          const resolverFunction = field.resolve

          field.resolve = function (this: any, rootValue, args, context, info) {
            const start = Date.now()
            const result = resolverFunction.apply(this, [rootValue, args, context, info])
            const end = Date.now()

            console.log(`${type.name}.${field.name}`, (result === null || result === undefined) ? 'null' : '...', `${end - start}ms`)

            return result
          }
        }
      }
    }
  }
}

export class App {
  static gqlSchema?: gql.GraphQLSchema

  server!: http.Server | http2.Http2SecureServer
  koa!: Koa
  typeormConnection!: Connection
  subscriptionServer!: SubscriptionServer

  static setupKoa({ useLogger } = { useLogger: false }) {
    const koa = new Koa()

    koa.use(cors({
      origin: '*',
      allowHeaders: ['Authorization', 'Content-Type', 'Content-Length'],
    }))

    koa.use(jsonError({
      format: (err: any, obj: any) => ({
        name: err.name,
        message: err.message,
        type: err.type,
        status: err.status,
        stack: (process.env.NODE_ENV !== 'production') ? err.stack : undefined,
      }),
    }))

    koa.use(bodyparser())

    if (useLogger) {
      koa.use(logger())
    }

    return koa
  }

  async listen({ useLogger } = { useLogger: false }) {
    this.koa = App.setupKoa({ useLogger })
    this.typeormConnection = await createConnection(Object.assign({}, config.get('database') as any))

    if (!App.gqlSchema) {
      App.gqlSchema = await buildGraphQLSchema()
    }

    const getCurrentUserFromAuthorization = async (authorizationHeader: string) => {
      if (authorizationHeader) {
        try {
          const token = authorizationHeader.slice('Bearer '.length)
          const parsedToken = await verifyJwt(token)

          if (parsedToken && typeof parsedToken === 'object') {
            return getManager().findOne(User, {
              where: { id: Equal(parsedToken.id) },
              relations: ['roles'],
            })
          }
        } catch {
          return undefined
        }
      }

      return undefined
    }

    this.koa.use(async (ctx, next) => {
      if (['GET', 'POST', 'PUT', 'DELETE'].includes(ctx.method)) {
        ctx.authContext = {
          currentUser: await getCurrentUserFromAuthorization(ctx.get('Authorization')),
          sessionId: ctx.ip,
        }
      }

      await next()
    })

    this.koa.use(koaGraphQLMiddleware(App.gqlSchema, ctx => ctx.authContext as Context))

    if (useLogger) {
      // applyGraphQLLogger(App.gqlSchema)
    }

    this.koa
      .use(router.routes())
      .use(router.allowedMethods())

    await new Promise<void>(resolve => {
      if (config.has('httpsConfig')) {
        const httpsConfigSource = config.get('httpsConfig') as any
        const httpsConfig = {
          allowHTTP1: true,
          key: readFileSync(httpsConfigSource.keyPath),
          cert: readFileSync(httpsConfigSource.certPath),
          ca: [readFileSync(httpsConfigSource.caPath)],
        }

        this.server = http2.createSecureServer(httpsConfig, this.koa.callback())
      } else {
        this.server = http.createServer(this.koa.callback())
      }

      this.server.listen(config.get('port'), config.get('host'), resolve)
    })

    // this.subscriptionServer = new SubscriptionServer({
    //   schema: App.gqlSchema,
    //   execute: gql.execute,
    //   subscribe: gql.subscribe,
    //   onConnect: async (connectionParams: any, webSocket: any) => {
    //     const currentUser = await getCurrentUserFromAuthorization(connectionParams.Authorization)

    //     if (!currentUser) {
    //       throw new UnauthorizedError()
    //     }

    //     return {
    //       currentUser,
    //     }
    //   },
    // }, {
    //   host: config.get('host'),
    //   port: config.get('subscriptionsWSPort'),
    //   path: '/subscriptions',
    // })
  }

  async close() {
    await new Promise<void>((resolve, reject) => {
      if (this.server) {
        this.server.close(err => err ? reject(err) : resolve())
      } else {
        resolve()
      }
    })

    if (this.typeormConnection) {
      await this.typeormConnection.close()
    }

    if (this.subscriptionServer) {
      this.subscriptionServer.close()
    }
  }
}
