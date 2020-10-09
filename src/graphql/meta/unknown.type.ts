import { GraphQLScalarType } from 'graphql'

export const GraphQlUnknown = new GraphQLScalarType({
  name: 'Unknown',
  serialize: value => value,
})
