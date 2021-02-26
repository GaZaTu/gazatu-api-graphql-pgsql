import { ObjectType, Field, ID } from 'type-graphql'

@ObjectType()
export class IDsResult {
  constructor(ids = [] as string[]) {
    this.ids = ids
  }

  @Field(type => [ID])
  ids!: string[]
}
