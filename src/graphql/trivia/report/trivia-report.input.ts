import { InputType, Field, ID } from 'type-graphql'
import { TriviaReport } from './trivia-report.type'

@InputType()
export class TriviaReportInput implements Partial<TriviaReport> {
  @Field(type => ID)
  questionId!: string

  @Field()
  message!: string

  @Field()
  submitter!: string
}
