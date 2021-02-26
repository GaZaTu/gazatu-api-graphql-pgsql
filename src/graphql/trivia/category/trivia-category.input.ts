import { InputType, Field, ID } from 'type-graphql'

@InputType()
export class TriviaCategoryInput {
  @Field(type => ID, { nullable: true })
  id!: string | null

  @Field()
  name!: string

  @Field(type => String, { nullable: true })
  description!: string | null

  @Field(type => String, { nullable: true })
  submitter!: string | null
}
