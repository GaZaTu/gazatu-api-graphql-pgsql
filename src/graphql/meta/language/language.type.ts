import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryColumn, BeforeInsert } from 'typeorm'
import { ObjectType, Field, ID } from 'type-graphql'
import { Node } from '../../node/node.interface'
import { toGlobalId } from 'graphql-relay'
import * as uuid from 'uuid'
import { PartialNullable } from '../../PartialNullable'

@Entity()
@ObjectType({ implements: [Node] })
export class Language implements Node {
  constructor(init?: PartialNullable<Language>) {
    Object.assign(this, init)
  }

  @PrimaryColumn()
  @Field(type => ID)
  id!: string

  @Column()
  @Field()
  name!: string

  @Column({ type: String, nullable: true })
  @Field(type => String, { nullable: true })
  languageCode!: string | null

  @Column({ type: String, nullable: true })
  @Field(type => String, { nullable: true })
  countryCode!: string | null

  @CreateDateColumn()
  @Field()
  createdAt!: Date

  @UpdateDateColumn()
  @Field()
  updatedAt!: Date

  @BeforeInsert()
  protected beforeInsert() {
    this.id = toGlobalId(this.constructor.name, uuid.v4())
  }
}
