import { InputType, Field } from 'type-graphql'
import { Language } from './language.type'

@InputType()
export class LanguageInput implements Partial<Language> {
  @Field()
  name!: string

  @Field()
  languageCode!: string

  @Field()
  countryCode!: string
}
