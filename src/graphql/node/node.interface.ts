import { InterfaceType, Field, ID, InputType } from 'type-graphql'

@InterfaceType()
export abstract class Node {
  @Field(type => ID)
  id!: string
}

@InputType()
export abstract class NodeRef implements Node {
  @Field(type => ID)
  id!: string
}
