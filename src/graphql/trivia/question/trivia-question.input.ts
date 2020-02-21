import { InputType, Field, ID } from 'type-graphql'
// import { TriviaQuestion } from './trivia-question.type'
import { NodeRef } from '../../node/node.interface'

@InputType()
export class TriviaQuestionInput {
  @Field(type => ID, { nullable: true })
  id?: string

  @Field()
  question!: string

  @Field()
  answer!: string

  @Field()
  category!: NodeRef

  @Field()
  language!: NodeRef

  @Field({ nullable: true })
  hint1?: string

  @Field({ nullable: true })
  hint2?: string

  @Field({ nullable: true })
  submitter?: string
}

// const refInputMap = new Map<string, new () => any>()

// function RefInputOf<T extends Node>(Constructor: new () => T) {
//   if (refInputMap.has(Constructor.name)) {
//     return refInputMap.get(Constructor.name)! as any as typeof RefInput
//   }

//   @InputType(`RefOf${Constructor.name}Input`)
//   class RefInput {
//     @Field(type => ID)
//     id!: string
//   }

//   Field()(RefInput, '')

//   return RefInput
// }

// const Test = RefInputOf(TriviaQuestion)

// type RefInputOf<T> = Partial<T>

// type XD = RefInputOf<TriviaQuestion>
