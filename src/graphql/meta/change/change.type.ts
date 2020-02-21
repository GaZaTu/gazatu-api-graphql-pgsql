import { Entity, Column, CreateDateColumn, PrimaryColumn, BeforeInsert } from 'typeorm'
import { ObjectType, Field, ID, registerEnumType } from 'type-graphql'
import { Node } from '../../node/node.interface'
import { toGlobalId } from 'graphql-relay'
import * as uuid from 'uuid'

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
  constructor(init?: Partial<Change>) {
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

  @Column({ nullable: true })
  @Field({ nullable: true })
  targetId?: string

  @Column({ nullable: true })
  @Field({ nullable: true })
  targetColumn?: string

  @Column({ nullable: true })
  @Field({ nullable: true })
  newColumnValue?: string

  @CreateDateColumn()
  @Field()
  createdAt!: Date

  @BeforeInsert()
  protected beforeInsert() {
    this.id = toGlobalId(this.constructor.name, uuid())
  }
}
