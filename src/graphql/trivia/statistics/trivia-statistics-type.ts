import { ObjectType, Field } from 'type-graphql'
import { TriviaCategory } from '../category/trivia-category.type'

@ObjectType()
export class TriviaStatistics {
  constructor(init?: Partial<TriviaStatistics>) {
    Object.assign(this, init)
  }

  @Field()
  questionsCount!: number

  @Field()
  verifiedQuestionsCount!: number

  @Field()
  categoriesCount!: number

  @Field()
  verifiedCategoriesCount!: number

  @Field(type => [TriviaCategory])
  topCategories!: TriviaCategory[]

  @Field(type => [String])
  topSubmitters!: string[]

  @Field(type => [Date])
  submissionDates!: Date[]
}
