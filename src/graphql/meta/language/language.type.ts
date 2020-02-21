import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryColumn, BeforeInsert } from 'typeorm'
import { ObjectType, Field, ID } from 'type-graphql'
import { Node } from '../../node/node.interface'
import { toGlobalId } from 'graphql-relay'
import * as uuid from 'uuid'

@Entity()
@ObjectType({ implements: [Node] })
export class Language implements Node {
  constructor(init?: Partial<Language>) {
    Object.assign(this, init)
  }

  @PrimaryColumn()
  @Field(type => ID)
  id!: string

  @Column()
  @Field()
  name!: string

  @Column({ nullable: true })
  @Field({ nullable: true })
  languageCode?: string

  @Column({ nullable: true })
  @Field({ nullable: true })
  countryCode?: string

  @CreateDateColumn()
  @Field()
  createdAt!: Date

  @UpdateDateColumn()
  @Field()
  updatedAt!: Date

  @BeforeInsert()
  protected beforeInsert() {
    this.id = toGlobalId(this.constructor.name, uuid())
  }
}
