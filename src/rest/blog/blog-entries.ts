import * as Router from '@koa/router'
import { getManager } from 'typeorm'
import { BlogEntry } from '../../graphql/blog/entry/blog-entry.type'
import { assertUserAuthorization } from '../../graphql/check-authorization'
import { UserRoles } from '../../graphql/user/role/user-role.type'
import * as sharp from 'sharp'

export const router = new Router()

router.get('/blog/entries/:id/image.:ext', async ctx => {
  const blogEntry = await getManager().findOne(BlogEntry, ctx.params.id)

  if (blogEntry && blogEntry.imageMimeType) {
    ctx.type = blogEntry.imageMimeType

    const { width, height } = ctx.query
    if (width || height) {
      const options = {
        width: width ? Number(width) : undefined,
        height: height ? Number(height) : undefined,
      } as const

      if (options.width && options.width > 1920) {
        throw new Error('width > 1920')
      }

      if (options.height && options.height > 1920) {
        throw new Error('height > 1920')
      }

      ctx.body = blogEntry.imageAsReadStream.pipe(sharp().resize(options).withMetadata())
    } else {
      ctx.body = blogEntry.imageAsReadStream
    }
  } else {
    ctx.status = 404
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

  ctx.status = 204
})
