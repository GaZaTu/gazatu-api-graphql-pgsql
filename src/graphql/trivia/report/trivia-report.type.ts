import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryColumn, BeforeInsert, ManyToOne, RelationId } from 'typeorm'
import { ObjectType, Field, ID } from 'type-graphql'
import { Node } from '../../node/node.interface'
import { TriviaQuestion } from '../question/trivia-question.type'
import * as uuid from 'uuid'
import { toGlobalId } from 'graphql-relay'

@Entity()
@ObjectType({ implements: [Node] })
export class TriviaReport implements Node {
  constructor(init?: Partial<TriviaReport>) {
    Object.assign(this, init)
  }

  @PrimaryColumn()
  @Field(type => ID)
  id!: string

  @ManyToOne(type => TriviaQuestion, { onDelete: 'CASCADE' })
  question!: TriviaQuestion

  @RelationId((self: TriviaReport) => self.question)
  questionId?: string

  @Column()
  @Field()
  message!: string

  @Column()
  @Field()
  submitter!: string

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
