import { InputType, Field } from 'type-graphql'
import { NodeRef } from '../node/node.interface'

@InputType()
export class UserInput {
  @Field(type => [NodeRef])
  roles!: NodeRef[]
}
