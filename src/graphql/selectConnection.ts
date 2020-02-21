import { ObjectType, getRepository, getMetadataArgsStorage, SelectQueryBuilder } from 'typeorm'
import { ConnectionArgs, parseConnectionArgs, connectionFromSlice } from './connection'
import { SearchAndSortArgs } from './search-and-sort'
import { tsvectorMetadata } from './tsvector'

const selectConnection = async <T>(entityClass: ObjectType<T>, connectionArgs: ConnectionArgs, searchAndSortArgs: SearchAndSortArgs, alias = 'entity', mapQuery: ((query: SelectQueryBuilder<T>) => SelectQueryBuilder<T>) = q => q) => {
  const { skip, take } = parseConnectionArgs(connectionArgs)
  const { search, sortField, sortDirection } = searchAndSortArgs
  const { tsvectorColumn } = tsvectorMetadata.get(entityClass) ?? {}

  if (sortField) {
    const sortFieldIsValid = getMetadataArgsStorage()
      .filterColumns(entityClass)
      .some(col => col.propertyName === sortField)

    if (!sortFieldIsValid) {
      throw new Error(`TODO: can only sort on direct fields for now`)
    }
  }

  let query = getRepository(entityClass)
    .createQueryBuilder(alias)
    .where(`(nullif(:search, '') IS NULL OR websearch_to_tsquery(:search) @@ ${alias}."${tsvectorColumn}")`, { search })
    .orderBy(sortField ? { [`"${sortField}"`]: { order: sortDirection, nulls: 'NULLS LAST' } } : {})
    .skip(skip)
    .take(take)

  query = mapQuery(query)

  const [result, count] = await query
    .getManyAndCount()

  const connection = connectionFromSlice(result, connectionArgs, {
    sliceStart: skip ?? 0,
    arrayLength: count,
  })

  return connection
}

export default selectConnection
