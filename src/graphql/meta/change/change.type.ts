import { Entity, Column, CreateDateColumn, PrimaryColumn, BeforeInsert } from 'typeorm'
import { ObjectType, Field, ID, registerEnumType } from 'type-graphql'
import { Node } from '../../node/node.interface'
import { toGlobalId } from 'graphql-relay'
import * as uuid from 'uuid'
import { PartialNullable } from '../../PartialNullable'

export enum ChangeKind {
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  REMOVE = 'REMOVE',
}

registerEnumType(ChangeKind, {
  name: 'ChangeKind',
})

@Entity()
@ObjectType({ implements: [Node] })
export class Change implements Node {
  constructor(init?: PartialNullable<Change>) {
    Object.assign(this, init)
  }

  @PrimaryColumn()
  @Field(type => ID)
  id!: string

  @Column({ enum: ChangeKind })
  @Field(type => ChangeKind)
  kind!: ChangeKind

  @Column()
  @Field()
  targetEntityName!: string

  @Column({ type: String, nullable: true })
  @Field(type => String, { nullable: true })
  targetId!: string | null

  @Column({ type: String, nullable: true })
  @Field(type => String, { nullable: true })
  targetColumn!: string | null

  @Column({ type: String, nullable: true })
  @Field(type => String, { nullable: true })
  newColumnValue!: string | null

  @CreateDateColumn()
  @Field()
  createdAt!: Date

  @BeforeInsert()
  protected beforeInsert() {
    this.id = toGlobalId(this.constructor.name, uuid.v4())
  }
}
