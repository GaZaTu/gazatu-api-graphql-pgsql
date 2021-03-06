import { Entity, Column, PrimaryColumn, BeforeInsert, getManager, Equal } from 'typeorm'
import { ObjectType, Field, ID } from 'type-graphql'
import { Node } from '../../node/node.interface'
import * as uuid from 'uuid'
import { toGlobalId } from 'graphql-relay'
import { OptOutOfChangeLogging } from '../../meta/change/change.subscriber'
import { PartialNullable } from '../../PartialNullable'

@OptOutOfChangeLogging()
@Entity()
@ObjectType({ implements: [Node] })
export class UserRole implements Node {
  constructor(init?: PartialNullable<UserRole>) {
    Object.assign(this, init)
  }

  @PrimaryColumn()
  @Field(type => ID)
  id!: string

  @Column({ unique: true })
  @Field()
  name!: string

  @Column({ type: String, nullable: true })
  @Field(type => String, { nullable: true })
  description!: string | null

  @BeforeInsert()
  protected beforeInsert() {
    this.id = toGlobalId(this.constructor.name, uuid.v4())
  }
}

export enum UserRoles {
  ADMIN = 'admin',
  TRIVIA_ADMIN = 'trivia-admin',
}

setTimeout(async () => {
  for (const name of Object.values(UserRoles)) {
    const existingRole = await getManager().findOne(UserRole, { name: Equal(name) })

    if (!existingRole) {
      await getManager().save(new UserRole({ name }))
    }
  }
}, 10000)
