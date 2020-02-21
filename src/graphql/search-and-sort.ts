import { ArgsType, Field, registerEnumType } from 'type-graphql'

export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

registerEnumType(SortDirection, {
  name: 'SortDirection',
})

@ArgsType()
export class SearchAndSortArgs {
  @Field(type => String, { nullable: true })
  search?: string

  @Field(type => String, { nullable: true })
  sortField?: string

  @Field(type => SortDirection, { defaultValue: SortDirection.ASC })
  sortDirection!: SortDirection
}
