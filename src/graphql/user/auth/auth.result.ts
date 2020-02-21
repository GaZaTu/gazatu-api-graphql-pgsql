import { ObjectType, Field } from 'type-graphql'
import { User, ExportableUser } from '../user.type'

@ObjectType()
export class AuthResult {
  constructor(init?: Partial<AuthResult>) {
    Object.assign(this, init)
  }

  @Field()
  token!: string

  @Field(type => User)
  user!: ExportableUser
}
