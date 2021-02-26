import { InputType, Field } from 'type-graphql'

@InputType()
export class TriviaQuestionLegacyInput {
  @Field()
  question!: string

  @Field()
  answer!: string

  @Field()
  category!: string

  @Field()
  language!: string

  @Field(type => String, { nullable: true })
  hint1!: string | null

  @Field(type => String, { nullable: true })
  hint2!: string | null

  @Field(type => String, { nullable: true })
  submitter!: string | null

  @Field()
  verified!: boolean

  @Field()
  disabled!: boolean

  @Field()
  createdAt!: Date

  @Field()
  updatedAt!: Date
}
