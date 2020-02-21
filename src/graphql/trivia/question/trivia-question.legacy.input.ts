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

  @Field({ nullable: true })
  hint1?: string

  @Field({ nullable: true })
  hint2?: string

  @Field({ nullable: true })
  submitter?: string

  @Field()
  verified!: boolean

  @Field()
  disabled!: boolean

  @Field()
  createdAt!: Date

  @Field()
  updatedAt!: Date
}
