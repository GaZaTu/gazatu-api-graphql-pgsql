import { InputType, Field, ID } from 'type-graphql'
import { TriviaCategory } from './trivia-category.type'

@InputType()
export class TriviaCategoryInput implements Partial<TriviaCategory> {
  @Field(type => ID, { nullable: true })
  id?: string

  @Field()
  name!: string

  @Field({ nullable: true })
  description?: string

  @Field({ nullable: true })
  submitter?: string
}
