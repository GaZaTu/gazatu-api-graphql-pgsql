import * as jwt from 'jsonwebtoken'
import * as config from 'config'
import { ExportableUser } from './user/user.type'

export function verifyJwt(token: string) {
  return new Promise<ExportableUser>((resolve, reject) => {
    jwt.verify(token, config.get('jwtSecret'), (err, res) => {
      err ? reject(err) : resolve(res as any)
    })
  })
}

export function signJwt(user: ExportableUser) {
  return new Promise<string>((resolve, reject) => {
    const { ...userPayloadWithoutId } = user
    const userPayload = { ...userPayloadWithoutId, id: user.id }

    jwt.sign(userPayload, config.get('jwtSecret'), (err, res) => {
      err ? reject(err) : resolve(res as any)
    })
  })
}
