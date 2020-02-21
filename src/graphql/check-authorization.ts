import { AuthChecker, UnauthorizedError, ForbiddenError } from 'type-graphql'
import { Context } from './context'
import { ExportableUser } from './user/user.type'

const checkAuthorization: AuthChecker<Context> = ({ context: { currentUser } }, roles) => {
  return checkUserAuthorization(currentUser, roles)
}

export default checkAuthorization

export function checkUserAuthorization(currentUser: ExportableUser | undefined, roles: string[]) {
  if (!currentUser) {
    return false
  }

  if (roles.length === 0) {
    return true
  }

  if (currentUser.roles?.some(role => roles.includes(role.name))) {
    return true
  }

  return false
}

export function assertUserAuthorization(currentUser: ExportableUser | undefined, roles: string[]): asserts currentUser is ExportableUser {
  if (!currentUser) {
    throw new UnauthorizedError()
  }

  if (!checkUserAuthorization(currentUser, roles)) {
    throw new ForbiddenError()
  }
}
