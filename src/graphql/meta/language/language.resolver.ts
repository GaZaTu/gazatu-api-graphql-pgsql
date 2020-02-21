import { Resolver, Mutation, Arg, ID, Query, Int, Authorized } from 'type-graphql'
import { getManager } from 'typeorm'
import { Language } from './language.type'
import { LanguageInput } from './language.input'
import { UserRoles } from '../../user/role/user-role.type'

@Resolver(type => Language)
export class LanguageResolver {
  @Query(returns => Language, { nullable: true, complexity: 5 })
  async language(
    @Arg('id', type => ID) id: string,
  ) {
    return getManager().findOne(Language, id)
  }

  @Query(returns => [Language], { complexity: 5 })
  async languages() {
    return getManager().find(Language)
  }

  @Authorized(UserRoles.ADMIN)
  @Mutation(returns => Language, { complexity: 5 })
  async addLanguage(
    @Arg('input') input: LanguageInput,
  ) {
    return getManager().save(Language, new Language(input))
  }
}
