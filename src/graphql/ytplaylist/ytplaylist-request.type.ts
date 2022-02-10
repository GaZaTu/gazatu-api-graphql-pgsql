import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryColumn, BeforeInsert, ManyToOne, RelationId } from 'typeorm'
import { ObjectType, Field, ID } from 'type-graphql'
import { Node } from '../node/node.interface'
import { toGlobalId } from 'graphql-relay'
import * as uuid from 'uuid'
import { PartialNullable } from '../PartialNullable'
import { User } from '../user/user.type'

@Entity()
@ObjectType({ implements: [Node] })
export class YTPlaylistRequest implements Node {
  constructor(init?: PartialNullable<YTPlaylistRequest>) {
    Object.assign(this, init)
  }

  @PrimaryColumn()
  @Field(type => ID)
  id!: string

  @ManyToOne(type => User, { onDelete: 'CASCADE' })
  forUser!: User

  @RelationId((self: YTPlaylistRequest) => self.forUser)
  forUserId!: string

  @Column()
  @Field()
  ytID!: string

  @Column({ type: String, nullable: true })
  @Field(type => String, { nullable: true })
  title!: string | null

  @Column({ type: String, nullable: true })
  @Field(type => String, { nullable: true })
  submitter!: string | null

  @Column({ default: false })
  @Field({ defaultValue: false })
  sent!: boolean

  @Column({ default: false })
  @Field({ defaultValue: false })
  done!: boolean

  @Column({ default: false })
  @Field({ defaultValue: false })
  verified!: boolean

  @CreateDateColumn()
  @Field(type => Date)
  createdAt!: Date

  @BeforeInsert()
  protected beforeInsert() {
    this.id = toGlobalId(this.constructor.name, uuid.v4())
  }
}
