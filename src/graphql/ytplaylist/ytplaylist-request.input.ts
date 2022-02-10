import { InputType, Field, ID } from 'type-graphql'

@InputType()
export class YTPlaylistRequestInput {
  @Field(type => ID, { nullable: true })
  id!: string | null

  @Field(type => ID)
  forUserId!: string

  @Field()
  ytID!: string

  @Field(type => String, { nullable: true })
  title!: string | null

  @Field(type => String, { nullable: true })
  submitter!: string | null

  @Field(type => String)
  authorization!: string
}
