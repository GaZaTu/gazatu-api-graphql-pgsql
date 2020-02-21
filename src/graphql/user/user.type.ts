import { Entity, Column, CreateDateColumn, UpdateDateColumn, RelationId, ManyToMany, JoinTable, BeforeInsert, PrimaryColumn } from 'typeorm'
import { ObjectType, Field, ID } from 'type-graphql'
import { Node } from '../node/node.interface'
import { UserRole } from './role/user-role.type'
import { toGlobalId } from 'graphql-relay'
import * as uuid from 'uuid'
import { OptOutOfChangeLogging } from '../meta/change/change.subscriber'

@OptOutOfChangeLogging()
@Entity()
@ObjectType({ implements: [Node] })
export class User implements Node {
  constructor(init?: Partial<User>) {
    Object.assign(this, init)
  }

  @PrimaryColumn()
  @Field(type => ID)
  id!: string

  @Column({ unique: true })
  @Field()
  username!: string

  @Column()
  password!: string

  @ManyToMany(type => UserRole)
  @JoinTable()
  roles?: UserRole[]

  @RelationId((self: User) => self.roles)
  roleIds?: string[]

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

export interface ExportableUser extends Omit<User, 'password'> { }
