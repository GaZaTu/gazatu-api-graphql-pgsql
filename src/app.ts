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

function koaGraphQLlMiddleware(schema: gql.GraphQLSchema, contextValue?: (ctx: Koa.Context) => unknown): Koa.Middleware {
  return async (ctx, next) => {
    if (ctx.path === '/graphql' && ctx.method === 'POST') {
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
      allowHeaders: ['Content-Type', 'Authorization'],
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

    this.koa.use(koaGraphQLlMiddleware(App.gqlSchema, async ctx => {
      return {
        currentUser: await getCurrentUserFromAuthorization(ctx.get('Authorization')),
        sessionId: ctx.ip,
      } as Context
    }))

    if (useLogger) {
      // applyGraphQLLogger(App.gqlSchema)
    }

    this.koa.use(async (ctx, next) => {
      if (ctx.path === '/trivia/questions' && ctx.method === 'GET') {
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

        if (ctx.query.submitter !== undefined) {
          query = query
            .andWhere('question."submitter" = :submitter', { submitter: ctx.query.submitter })
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
      }

      return next()
    })

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
