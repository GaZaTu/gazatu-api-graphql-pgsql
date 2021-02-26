import * as fs from 'fs'
import { buildSchema } from 'type-graphql'
import { Container } from 'typedi'
import nodeResolvers from './node'
import metaResolvers from './meta'
import userResolvers from './user'
import triviaResolvers from './trivia'
import blogResolvers from './blog'
import checkAuthorization from './check-authorization'
import gqlToTs from './gqlToTs'
import pubsub from './pubsub'

async function buildGraphQLSchema() {
  const schemaGqlPath = './data/schema.gql'
  const schema = await buildSchema({
    resolvers: [
      ...nodeResolvers,
      ...metaResolvers,
      ...userResolvers,
      ...triviaResolvers,
      ...blogResolvers,
    ] as any,
    // resolvers: ['./dist/**/*.resolver.js'],
    container: Container,
    authMode: 'null',
    authChecker: checkAuthorization,
    emitSchemaFile: schemaGqlPath,
    pubSub: pubsub,
    validate: false,
  })

  await fs.promises.readFile(schemaGqlPath)
    .then(buffer => buffer.toString())
    .then(gqlToTs)
    .then(ts => fs.promises.writeFile(`${schemaGqlPath}.ts`, ts))

  return schema
}

export default buildGraphQLSchema
