import { ArgsType, Field, Int, ObjectType } from 'type-graphql'
import { cursorToOffset, getOffsetWithDefault, offsetToCursor, ConnectionCursor } from 'graphql-relay'

@ArgsType()
export class ConnectionArgs {
  @Field(type => String, { nullable: true })
  before?: ConnectionCursor

  @Field(type => String, { nullable: true })
  after?: ConnectionCursor

  @Field(type => Int, { nullable: true })
  first?: number

  @Field(type => Int, { nullable: true })
  last?: number

  @Field(type => Int, { nullable: true })
  skipPages?: number
}

export function parseConnectionArgs(args: ConnectionArgs) {
  let skip = undefined as number | undefined
  let take = undefined as number | undefined
  
  if (args.before && args.last) {
    skip = cursorToOffset(args.before) - args.last
    take = args.last

    if (args.skipPages) {
      skip -= args.last * args.skipPages
    }

    if (skip < 0) {
      skip = 0
    }
  } else if (args.after && args.first) {
    skip = cursorToOffset(args.after) + 1
    take = args.first

    if (args.skipPages) {
      skip += args.first * args.skipPages
    }
  } else if (args.first) {
    skip = 0
    take = args.first

    if (args.skipPages) {
      skip += args.first * args.skipPages
    }
  }

  return { skip, take }
}

export function connectionFromSlice<T>(arraySlice: T[], args: ConnectionArgs, meta: { sliceStart: number, arrayLength: number }): IConnection<T> {
  const { after, before, first, last } = args
  const { sliceStart, arrayLength } = meta
  const sliceEnd = sliceStart + arraySlice.length
  const beforeOffset = getOffsetWithDefault(before, arrayLength)
  const afterOffset = getOffsetWithDefault(after, -1)

  let startOffset = Math.max(sliceStart - 1, afterOffset, -1) + 1
  let endOffset = Math.min(sliceEnd, beforeOffset, arrayLength)

  if (typeof first === 'number') {
    if (first < 0) {
      throw new Error('Argument "first" must be a non-negative integer')
    }

    endOffset = Math.min(endOffset, startOffset + first);
  }

  if (typeof last === 'number') {
    if (last < 0) {
      throw new Error('Argument "last" must be a non-negative integer')
    }

    startOffset = Math.max(startOffset, endOffset - last)
  }

  // If supplied slice is too large, trim it down before mapping over it.
  const slice = arraySlice.slice(
    Math.max(startOffset - sliceStart, 0),
    arraySlice.length - (sliceEnd - endOffset),
  )

  const edges = slice.map((value, index) => ({
    cursor: offsetToCursor(startOffset + index),
    node: value,
  }))

  const firstEdge = edges[0]
  const lastEdge = edges[edges.length - 1]
  const lowerBound = after ? afterOffset + 1 : 0
  const upperBound = before ? beforeOffset : arrayLength

  return {
    edges,
    pageInfo: {
      startCursor: firstEdge ? firstEdge.cursor : null,
      endCursor: lastEdge ? lastEdge.cursor : null,
      hasPreviousPage: typeof last === 'number' ? startOffset > lowerBound : sliceStart > 0,
      hasNextPage: typeof first === 'number' ? endOffset < upperBound : sliceEnd < arrayLength,
      count: arrayLength,
    },
  }
}

interface IPageInfo {
  startCursor: ConnectionCursor | null
  endCursor: ConnectionCursor | null
  hasPreviousPage: boolean
  hasNextPage: boolean
  count: number
}

interface IEdge<T> {
  node: T
  cursor: ConnectionCursor
}

interface IConnection<T> {
  edges: IEdge<T>[]
  pageInfo: IPageInfo
}

@ObjectType()
export class PageInfo implements IPageInfo {
  @Field(type => String, { nullable: true })
  startCursor!: ConnectionCursor | null

  @Field(type => String, { nullable: true })
  endCursor!: ConnectionCursor | null

  @Field(type => Boolean)
  hasPreviousPage!: boolean

  @Field(type => Boolean)
  hasNextPage!: boolean

  @Field(type => Int)
  count!: number
}

const edgeTypeMap = new Map<string, new () => any>()

export function EdgeOf<T>(Constructor: new () => T) {
  if (edgeTypeMap.has(Constructor.name)) {
    return edgeTypeMap.get(Constructor.name)! as any as typeof Edge
  }

  @ObjectType(`${Constructor.name}Edge`)
  class Edge implements IEdge<T> {
    @Field(type => Constructor)
    node!: T

    @Field(type => String)
    cursor!: ConnectionCursor
  }

  edgeTypeMap.set(Constructor.name, Edge)

  return Edge
}

const connectionTypeMap = new Map<string, new () => any>()

export function ConnectionOf<T>(Constructor: new () => T) {
  if (connectionTypeMap.has(Constructor.name)) {
    return connectionTypeMap.get(Constructor.name)! as any as typeof Connection
  }

  const Edge = EdgeOf(Constructor)

  @ObjectType(`${Constructor.name}Connection`)
  class Connection implements IConnection<T> {
    @Field(type => [Edge])
    edges!: ((typeof Edge)['prototype'])[]

    @Field(type => PageInfo)
    pageInfo!: PageInfo
  }

  connectionTypeMap.set(Constructor.name, Connection)

  return Connection
}
