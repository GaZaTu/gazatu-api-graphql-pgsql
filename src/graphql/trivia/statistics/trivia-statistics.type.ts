import { ObjectType, Field } from 'type-graphql'
import { PartialNullable } from '../../PartialNullable'
import { TriviaCategory } from '../category/trivia-category.type'

@ObjectType()
export class TriviaStatistics {
  constructor(init?: PartialNullable<TriviaStatistics>) {
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
