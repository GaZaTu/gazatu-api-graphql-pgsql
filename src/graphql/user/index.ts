import { UserResolver } from './user.resolver'
import { UserRoleResolver } from './role/user-role.resolver'
import { AuthResolver } from './auth/auth.resolver'

const resolvers = [
  UserResolver,
  UserRoleResolver,
  AuthResolver,
]

export default resolvers
