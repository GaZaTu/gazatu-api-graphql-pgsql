import { InputType, Field } from 'type-graphql'
import { UserRole } from './user-role.type'

@InputType()
export class UserRoleInput implements Partial<UserRole> {
  @Field()
  name!: string
}
