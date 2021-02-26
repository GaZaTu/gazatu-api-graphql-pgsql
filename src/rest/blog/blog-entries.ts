import * as Router from '@koa/router'
import { getManager } from 'typeorm'
import { BlogEntry } from '../../graphql/blog/entry/blog-entry.type'
import { assertUserAuthorization } from '../../graphql/check-authorization'
import { UserRoles } from '../../graphql/user/role/user-role.type'

export const router = new Router()

router.get('/blog/entries/:id/image.:ext', async ctx => {
  const blogEntry = await getManager().findOne(BlogEntry, ctx.params.id)

  if (blogEntry && blogEntry.imageMimeType) {
    ctx.type = blogEntry.imageMimeType
    ctx.body = blogEntry.imageAsReadStream
  } else {
    ctx.body = undefined
  }
})

router.post('/blog/entries/:id/image.:ext', async ctx => {
  assertUserAuthorization((ctx as any).authContext.currentUser, [UserRoles.ADMIN])

  const blogEntry = await getManager().findOne(BlogEntry, ctx.params.id)

  if (blogEntry) {
    blogEntry.imageMimeType = ctx.headers['content-type']!
    blogEntry.imageFileExtension = ctx.params.ext

    const imageAsWriteStream = blogEntry.imageAsWriteStream
    for await (let chunk of ctx.req) {
      imageAsWriteStream.write(chunk)
    }
    imageAsWriteStream.close()

    await getManager().save(BlogEntry, blogEntry)
  }

  ctx.body = undefined
})
