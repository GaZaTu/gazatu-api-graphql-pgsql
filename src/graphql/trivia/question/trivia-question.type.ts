import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryColumn, BeforeInsert, ManyToOne, VersionColumn, RelationId } from 'typeorm'
import { ObjectType, Field, ID } from 'type-graphql'
import { Node } from '../../node/node.interface'
import { User } from '../../user/user.type'
import { TriviaCategory } from '../category/trivia-category.type'
import { Language } from '../../meta/language/language.type'
import { toGlobalId } from 'graphql-relay'
import * as uuid from 'uuid'
import { ToTSVector, TSVectorColumn } from '../../tsvector'
import { PartialNullable } from '../../PartialNullable'

@Entity()
@ObjectType({ implements: [Node] })
export class TriviaQuestion implements Node {
  constructor(init?: PartialNullable<TriviaQuestion>) {
    Object.assign(this, init)
  }

  @PrimaryColumn()
  @Field(type => ID)
  id!: string

  @ToTSVector()
  @Column()
  @Field()
  question!: string

  @ToTSVector()
  @Column()
  @Field()
  answer!: string

  @ToTSVector({ subCols: ['name'] })
  @ManyToOne(type => TriviaCategory)
  category!: TriviaCategory

  @RelationId((self: TriviaQuestion) => self.category)
  categoryId!: string

  @ManyToOne(type => Language)
  language!: Language

  @RelationId((self: TriviaQuestion) => self.language)
  languageId!: string

  @ToTSVector()
  @Column({ type: String, nullable: true })
  @Field(type => String, { nullable: true })
  hint1!: string | null

  @ToTSVector()
  @Column({ type: String, nullable: true })
  @Field(type => String, { nullable: true })
  hint2!: string | null

  @ToTSVector()
  @Column({ type: String, nullable: true })
  @Field(type => String, { nullable: true })
  submitter!: string | null

  @ManyToOne(type => User, { nullable: true, onDelete: 'SET NULL' })
  submitterUser!: User | null

  @RelationId((self: TriviaQuestion) => self.submitterUser)
  submitterUserId!: string | null

  @Column({ default: false })
  @Field({ defaultValue: false })
  verified!: boolean

  @Column({ default: false })
  @Field({ defaultValue: false })
  disabled!: boolean

  @ManyToOne(type => User, { nullable: true, onDelete: 'SET NULL' })
  updatedBy!: User | null

  @RelationId((self: TriviaQuestion) => self.updatedBy)
  updatedById!: string | null

  @CreateDateColumn()
  @Field()
  createdAt!: Date

  @UpdateDateColumn()
  @Field()
  updatedAt!: Date

  @VersionColumn()
  @Field()
  version!: number

  @TSVectorColumn()
  tsvectorColumn!: any | null

  @BeforeInsert()
  protected beforeInsert() {
    this.id = toGlobalId(this.constructor.name, uuid.v4())
  }
}
