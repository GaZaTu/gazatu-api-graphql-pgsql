import { InputType, Field, ID } from 'type-graphql'

@InputType()
export class YTPlaylistRequestInput {
  @Field(type => ID, { nullable: true })
  id!: string | null

  @Field(type => ID)
  forUserId!: string

  @Field()
  ytUrlOrID!: string

  @Field(type => String, { nullable: true })
  requestedBy!: string | null

  @Field(type => String)
  authorization!: string
}
