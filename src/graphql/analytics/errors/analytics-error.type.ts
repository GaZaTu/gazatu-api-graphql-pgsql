import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryColumn, BeforeInsert } from 'typeorm'
import { ObjectType, Field, ID } from 'type-graphql'
import { Node } from '../../node/node.interface'
import { toGlobalId } from 'graphql-relay'
import * as uuid from 'uuid'
import { GraphQlUnknown } from '../../meta/unknown.type'

@Entity()
@ObjectType({ implements: [Node] })
export class AnalyticsError implements Node {
  constructor(init?: Partial<AnalyticsError>) {
    Object.assign(this, init)
  }

  @PrimaryColumn()
  @Field(type => ID)
  id!: string

  @Column()
  @Field()
  type!: string

  @Column()
  @Field()
  url!: string

  @Column()
  @Field()
  userAgent!: string

  @Column('json')
  @Field(type => GraphQlUnknown)
  body!: unknown

  @CreateDateColumn()
  @Field(type => Date)
  createdAt!: Date

  @UpdateDateColumn()
  @Field(type => Date)
  updatedAt!: Date

  @BeforeInsert()
  protected beforeInsert() {
    this.id = toGlobalId(this.constructor.name, uuid())
  }
}
