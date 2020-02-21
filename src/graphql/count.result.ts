import { ObjectType, Field, Int } from 'type-graphql'

@ObjectType()
export class CountResult {
  constructor(count = 0) {
    this.count = count
  }

  @Field(type => Int)
  count!: number
}
