import { Field, ID, InputType } from 'type-graphql'

@InputType()
export class BlogEntryInput {
  @Field(type => ID, { nullable: true })
  id!: string | null

  @Field(type => String, { nullable: true })
  story!: string | null

  @Field(type => String, { nullable: true })
  title!: string | null

  @Field(type => String, { nullable: true })
  message!: string | null

  @Field(type => String, { nullable: true })
  imageAsBase64!: string | null

  @Field(type => String, { nullable: true })
  imageMimeType!: string | null

  @Field(type => String, { nullable: true })
  imageAsDataURL!: string | null

  @Field(type => String, { nullable: true })
  imageFileExtension!: string | null
}
