import { ObjectType, Field } from 'type-graphql'

@ObjectType()
export class TriviaCounts {
  constructor(init?: Partial<TriviaCounts>) {
    Object.assign(this, init)
  }

  @Field()
  questionsCount!: number

  @Field()
  unverifiedQuestionsCount!: number

  @Field()
  categoriesCount!: number

  @Field()
  unverifiedCategoriesCount!: number

  @Field()
  reportsCount!: number

  @Field()
  reportedQuestionsCount!: number

  @Field()
  danglingQuestionsCount!: number
}
