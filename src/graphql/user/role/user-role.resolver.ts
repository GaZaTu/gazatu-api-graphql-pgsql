import { Resolver, Query, Mutation, Arg, Authorized, ID } from 'type-graphql'
import { getManager, Equal } from 'typeorm'
import { UserRole, UserRoles } from './user-role.type'
import { UserRoleInput } from './user-role.input'

@Resolver(type => UserRole)
export class UserRoleResolver {
  @Query(returns => UserRole, { nullable: true, complexity: 2 })
  async userRole(
    @Arg('id', type => ID) id: string,
  ) {
    return getManager().findOne(UserRole, id)
  }

  @Query(returns => [UserRole], { complexity: 5 })
  async userRoles() {
    return getManager().find(UserRole)
  }

  @Authorized(UserRoles.ADMIN)
  @Mutation(returns => UserRole, { complexity: 5 })
  async getOrAddUserRole(
    @Arg('input') input: UserRoleInput,
  ) {
    const role = await getManager().findOne(UserRole, { name: Equal(input.name) })

    if (role) {
      return role
    } else {
      return getManager().save(UserRole, new UserRole(input))
    }
  }
}
