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
    ctx.body = blogEntry.imageAsReadStream
  } else {
    ctx.status = 404
  }
})

router.get('/blog/entries/:id/preview.:ext', async ctx => {
  const blogEntry = await getManager().findOne(BlogEntry, ctx.params.id)

  if (blogEntry && blogEntry.imageMimeType) {
    if (!blogEntry.previewExists) {
      await new Promise(resolve => {
        blogEntry.imageAsReadStream
          .pipe(sharp().resize({ width: 128, height: 128 }).withMetadata())
          .pipe(blogEntry.previewAsWriteStream)
          .on('close', resolve)
      })
    }

    ctx.type = blogEntry.imageMimeType
    ctx.body = blogEntry.previewAsReadStream
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
