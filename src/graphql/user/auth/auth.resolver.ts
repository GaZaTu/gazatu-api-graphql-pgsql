import { Resolver, Query, Mutation, Arg, Ctx, UnauthorizedError } from 'type-graphql'
import { getManager, Equal } from 'typeorm'
import * as argon2 from 'argon2'
import * as config from 'config'
import { signJwt } from '../../jwt'
import { User } from '../user.type'
import { AuthResult } from './auth.result'
import { UserRoleResolver } from '../role/user-role.resolver'
import { UserRoleInput } from '../role/user-role.input'

export class HttpError extends Error {
  code: number

  constructor(message?: string, code = 500) {
    super(message)

    this.code = code
  }
}

interface AuthenticationAttempt {
  count: number
  timestamp: number
}

const recentAuthenticationAttempts = new Map<string | number, AuthenticationAttempt>()

@Resolver()
export class AuthResolver {
  @Query(returns => AuthResult, { complexity: 20 })
  async authenticate(
    @Ctx('sessionId') sessionId: string | number,
    @Arg('username') username: string,
    @Arg('password') password: string,
  ) {
    const recentAuthenticationAttempt = recentAuthenticationAttempts.get(sessionId)

    if (recentAuthenticationAttempt) {
      const secs = (secs: number) => secs * 1000
      const mins = (mins: number) => secs(mins * 60)

      let waitMs = 0

      if (recentAuthenticationAttempt.count > 12) {
        waitMs = mins(5)
      } else if (recentAuthenticationAttempt.count > 6) {
        waitMs = mins(1)
      } else if (recentAuthenticationAttempt.count > 3) {
        waitMs = secs(5)
      }

      if (recentAuthenticationAttempt.timestamp > (Date.now() - waitMs)) {
        throw new UnauthorizedError()
      }

      recentAuthenticationAttempt.count += 1
      recentAuthenticationAttempt.timestamp = Date.now()
    }

    const user = await getManager().findOne(User, {
      where: { username: Equal(username) },
      relations: ['roles'],
    })

    if (user) {
      if (await argon2.verify(user.password, password)) {
        user.password = undefined!

        if (recentAuthenticationAttempt) {
          recentAuthenticationAttempts.delete(sessionId)
        }

        return new AuthResult({
          token: await signJwt(user),
          user,
        })
      }
    }

    if (!recentAuthenticationAttempt) {
      recentAuthenticationAttempts.set(sessionId, {
        count: 1,
        timestamp: Date.now(),
      })
    }

    throw new UnauthorizedError()
  }

  @Mutation(returns => AuthResult, { complexity: 20 })
  async registerUser(
    @Arg('username') username: string,
    @Arg('password') password: string,
  ) {
    const hashedPassword = await argon2.hash(password)
    const user = new User({ username, password: hashedPassword })
    const defaultUserRoles = config.get<{ [key: string]: string[] }>('defaultUserRoles')

    if (defaultUserRoles[user.username]) {
      user.roles = await Promise.all(
        defaultUserRoles[user.username].map(defaultUserRole => {
          const input = new UserRoleInput()
          input.name = defaultUserRole

          return new UserRoleResolver().getOrAddUserRole(input)
        })
      )
    }

    await getManager().save(User, user)

    return this.authenticate(0, username, password)
  }
}
