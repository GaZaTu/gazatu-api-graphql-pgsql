import * as Router from '@koa/router'
import * as fetch from 'node-fetch'

export const aoe4Regions = {
  // 'unknown': '0',
  'global': '7',
} as const

export type AoE4MatchType = 'unranked' | 'ranked'
export type AoE4Region = (typeof aoe4Regions)[keyof (typeof aoe4Regions)]
export type AoE4TeamSize = '1v1' | '2v2' | '3v3' | '4v4'
export type AoE4Versus = 'players'

export type AoE4LeaderboardRequest = {
  count: number
  matchType: AoE4MatchType
  page: number
  region: AoE4Region
  searchPlayer: string
  teamSize: AoE4TeamSize
  versus: AoE4Versus
}

export type AoE4LeaderboardResponse = {
  count: number
  items: {
    avatarUrl: string | null
    elo: number
    eloRating: 0
    gameId: '4'
    losses: number
    playerNumber: unknown
    rank: number
    rankIcon: string
    rankLevel: string
    region: '0'
    rlUserId: number
    userId: string
    userName: string
    winPercent: number
    winStreak: number
    wins: number
  }[]
}

export const fetchAoE4Rank = async (request: Partial<AoE4LeaderboardRequest> = {}) => {
  const API_URL = 'https://api.ageofempires.com/api/ageiv/Leaderboard'
  const defaults: AoE4LeaderboardRequest = {
    count: 25,
    matchType: 'unranked',
    page: 1,
    region: aoe4Regions.global,
    searchPlayer: '',
    teamSize: '1v1',
    versus: 'players',
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ ...defaults, ...request }),
  })

  const data = await response.json() as AoE4LeaderboardResponse
  return data
}

export const router = new Router()

const numberSignedFormat = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
} as any)

const numberAlwaysSignedFormat = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
  signDisplay: 'always',
} as any)

router.get('/stuff/aoe4rank', async ctx => {
  const aoe4rankResult = await fetchAoE4Rank({
    searchPlayer: String(ctx.query.q ?? ''),
    teamSize: String(ctx.query.size ?? '1v1') as AoE4TeamSize,
    matchType: String(ctx.query.type ?? 'unranked') as AoE4MatchType,
    count: 1,
  })

  const aoe4rank = aoe4rankResult.items[0]

  switch (ctx.accepts('text')) {
    case 'text': {
      ctx.response.type = 'text/plain'

      if (aoe4rank) {
        const {
          userName,
          elo,
          rank,
          rankLevel,
          losses,
          wins,
          winPercent,
          winStreak,
        } = aoe4rank

        ctx.body = `${userName} (Elo: ${elo}, ${rankLevel}) Rank #${numberSignedFormat.format(rank)}, has played ${losses + wins} games with a ${winPercent}% winrate, and a ${numberAlwaysSignedFormat.format(winStreak)} streak`
      } else {
        ctx.body = `Player not found`
      }

      break
    }

    default:
      ctx.throw(406)
  }
})
