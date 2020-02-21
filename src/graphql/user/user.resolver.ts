import { Resolver, Query, Mutation, Arg, Ctx, Authorized, ID, FieldResolver, Root } from 'type-graphql'
import { getManager, In } from 'typeorm'
import { User, ExportableUser } from './user.type'
import { UserInput } from './user.input'
import { assertUserAuthorization } from '../check-authorization'
import { CountResult } from '../count.result'
import { UserRole, UserRoles } from './role/user-role.type'

@Resolver(type => User)
export class UserResolver {
  @Authorized()
  @Query(returns => User, { nullable: true, complexity: 5 })
  async user(
    @Ctx('currentUser') currentUser: ExportableUser,
    @Arg('id', type => ID) id: string,
  ) {
    const user = await getManager().findOne(User, id)

    if (user?.id !== currentUser!.id) {
      assertUserAuthorization(currentUser, [UserRoles.ADMIN])
    }

    return user
  }

  @Authorized(UserRoles.ADMIN)
  @Query(returns => [User])
  async users() {
    return getManager().find(User)
  }

  @Authorized()
  @Mutation(returns => User, { nullable: true, complexity: 5 })
  async updateUser(
    @Ctx('currentUser') currentUser: ExportableUser,
    @Arg('id', type => ID) id: string,
    @Arg('input') input: UserInput,
  ) {
    const user = await this.user(currentUser, id)

    if (user) {
      Object.assign(user, input)

      return getManager().save(user)
    } else {
      return undefined
    }
  }

  @Authorized()
  @Mutation(returns => CountResult, { complexity: 5 })
  async deleteUser(
    @Ctx('currentUser') currentUser: ExportableUser,
    @Arg('id', type => ID) id: string,
  ) {
    const user = await this.user(currentUser, id)

    if (user) {
      await getManager().delete(User, user.id)

      return new CountResult(1)
    } else {
      return new CountResult(0)
    }
  }

  @Authorized()
  @Query(returns => User, { nullable: true, complexity: 2 })
  async currentUser(
    @Ctx('currentUser') currentUser: ExportableUser,
  ) {
    return currentUser
  }

  @FieldResolver(type => [UserRole], { complexity: 5 })
  async roles(
    @Root() user: User,
  ) {
    return getManager().find(UserRole, {
      where: {
        id: In(user.roleIds ?? []),
      },
    })
  }
}
