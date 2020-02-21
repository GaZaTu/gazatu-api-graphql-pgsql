import { ExportableUser } from './user/user.type'

export interface Context {
  currentUser?: ExportableUser
  sessionId: string | number
}
