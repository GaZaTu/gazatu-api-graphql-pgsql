import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryColumn, BeforeInsert, ManyToOne, RelationId } from 'typeorm'
import { ObjectType, Field, ID } from 'type-graphql'
import { Node } from '../../node/node.interface'
import { User } from '../../user/user.type'
import { toGlobalId } from 'graphql-relay'
import * as uuid from 'uuid'

@Entity()
@ObjectType({ implements: [Node] })
export class TriviaCategory implements Node {
  constructor(init?: Partial<TriviaCategory>) {
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
  description?: string

  @Column({ nullable: true })
  @Field({ nullable: true })
  submitter?: string

  @ManyToOne(type => User, { nullable: true, onDelete: 'SET NULL' })
  submitterUser?: User

  @RelationId((self: TriviaCategory) => self.submitterUser)
  submitterUserId?: string

  @Column({ default: false })
  @Field({ defaultValue: false })
  verified!: boolean

  @Column({ default: false })
  @Field({ defaultValue: false })
  disabled!: boolean

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
