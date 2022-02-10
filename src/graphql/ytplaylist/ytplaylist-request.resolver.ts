import { Resolver, Mutation, Arg, ID, Query, Ctx, Authorized, UnauthorizedError } from 'type-graphql'
import { getManager, In } from 'typeorm'
import { YTPlaylistRequest } from './ytplaylist-request.type'
import { YTPlaylistRequestInput } from './ytplaylist-request.input'
import * as config from 'config'
import { CountResult } from '../count.result'
import { ExportableUser } from '../user/user.type'
import * as fetch from 'node-fetch'

type NoEmbedResponse = {
  'error': undefined
  'author_name': string
  'title': string
  'html': string
} | {
  'error': string
}

const resolveYTVideo = async (url: string) => {
  if (!url) {
    return undefined
  }

  if (url.startsWith('/watch')) {
    url = `https://youtube.com${url}`
  }

  if (!url.startsWith('http')) {
    url = `https://youtube.com/watch?v=${url}`
  }

  const noembedUrl = `https://noembed.com/embed?url=${url}`
  const response = await fetch(noembedUrl)
    .then(r => r.json()) as NoEmbedResponse

  if (response.error !== undefined) {
    return undefined
  }

  const regex = /https:\/\/www\.youtube\.com\/embed\/([^?]+)/
  const match = regex.exec(response.html)

  if (!match) {
    return undefined
  }

  return {
    ytID: match[1],
    channel: response.author_name,
    title: response.title,
  }
}

@Resolver(type => YTPlaylistRequest)
export class YTPlaylistRequestResolver {
  @Mutation(returns => YTPlaylistRequest, { complexity: 5 })
  async submitYTPlaylistRequest(
    @Arg('input') input: YTPlaylistRequestInput,
  ) {
    const { id, ytUrlOrID, authorization, ...requestInput } = input

    // localhost only
    if (authorization != config.get('jwtSecret')) {
      throw new UnauthorizedError()
    }

    const request = new YTPlaylistRequest({
      id: id ?? undefined,
      ...requestInput,
      ...(await resolveYTVideo(ytUrlOrID)),
      verified: true,
    })

    return getManager().save(YTPlaylistRequest, request)
  }

  @Authorized()
  @Mutation(returns => CountResult, { complexity: 5 })
  async removeYTPlaylistRequest(
    @Arg('ids', type => [ID]) ids: string[],
    @Ctx('currentUser') currentUser: ExportableUser,
  ) {
    const result = await getManager().delete(YTPlaylistRequest, {
      forUserId: currentUser.id,
      id: In(ids),
    })

    return new CountResult(result.affected ?? 0)
  }

  @Authorized()
  @Query(returns => YTPlaylistRequest, { nullable: true, complexity: 5 })
  async getNextInMyYTPlaylist(
    @Ctx('currentUser') currentUser: ExportableUser,
  ) {
    const request = await getManager().findOne(YTPlaylistRequest, {
      where: {
        forUserId: currentUser.id,
        sent: false,
        done: false,
        verified: true,
      },
      order: {
        createdAt: 'ASC',
      },
    })

    if (!request) {
      return null
    }

    request.sent = true

    return getManager().save(YTPlaylistRequest, request)
  }

  @Authorized()
  @Query(returns => YTPlaylistRequest, { nullable: true, complexity: 5 })
  async finishCurrentInMyYTPlaylist(
    @Ctx('currentUser') currentUser: ExportableUser,
  ) {
    const request = await getManager().findOne(YTPlaylistRequest, {
      where: {
        forUserId: currentUser.id,
        sent: true,
        done: false,
        verified: true,
      },
      order: {
        createdAt: 'ASC',
      },
    })

    if (!request) {
      return null
    }

    request.done = true

    return getManager().save(YTPlaylistRequest, request)
  }
}
