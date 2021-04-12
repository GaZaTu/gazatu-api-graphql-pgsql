import { toGlobalId } from 'graphql-relay'
import { Field, ID, ObjectType } from 'type-graphql'
import { BeforeInsert, BeforeUpdate, Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm'
import * as uuid from 'uuid'
import { Node } from '../../node/node.interface'
import { PartialNullable } from '../../PartialNullable'
import * as fs from 'fs'

@Index(['story', 'title'], { unique: true })
@Entity()
@ObjectType({ implements: [Node] })
export class BlogEntry implements Node {
  promises: Promise<void>[] | undefined

  constructor(init?: PartialNullable<BlogEntry>) {
    Object.assign(this, init)
  }

  @PrimaryColumn()
  @Field(type => ID)
  id!: string

  @Column()
  @Field()
  story!: string

  @Column()
  @Field()
  title!: string

  @Column({ type: String, nullable: true })
  @Field(type => String, { nullable: true })
  message!: string | null

  // @Column({ type: 'bytea',  nullable: true })
  // image!: Buffer | null

  get imageFSPath() {
    const imagesDir = `${__dirname}/../../../../data/files/blog/images`

    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir)
    }

    return `${imagesDir}/${this.id}`
  }

  get imageExists() {
    return fs.existsSync(this.imageFSPath)
  }

  get image() {
    return fs.promises.readFile(this.imageFSPath)
  }

  set image(v: Buffer | Promise<Buffer>) {
    this.promises ??= []
    this.promises.push(Promise.resolve(v).then(v => fs.promises.writeFile(this.imageFSPath, v)))
  }

  get imageAsReadStream() {
    return fs.createReadStream(this.imageFSPath)
  }

  get imageAsWriteStream() {
    return fs.createWriteStream(this.imageFSPath)
  }

  get previewFSPath() {
    const previewsDir = `${__dirname}/../../../../data/files/blog/previews`

    if (!fs.existsSync(previewsDir)) {
      fs.mkdirSync(previewsDir)
    }

    return `${previewsDir}/${this.id}`
  }

  get previewExists() {
    return fs.existsSync(this.previewFSPath)
  }

  get preview() {
    return fs.promises.readFile(this.previewFSPath)
  }

  set preview(v: Buffer | Promise<Buffer>) {
    this.promises ??= []
    this.promises.push(Promise.resolve(v).then(v => fs.promises.writeFile(this.previewFSPath, v)))
  }

  get previewAsReadStream() {
    return fs.createReadStream(this.previewFSPath)
  }

  get previewAsWriteStream() {
    return fs.createWriteStream(this.previewFSPath)
  }

  @Field(type => String, { nullable: true, complexity: 5 })
  get imageAsBase64() {
    return this.image?.toString('base64')
  }

  set imageAsBase64(value) {
    if (!value) {
      return
    }

    this.image = Buffer.from(value, 'base64')
  }

  @Column({ type: String, nullable: true })
  @Field(type => String, { nullable: true })
  imageMimeType!: string | null

  @Field(type => String, { nullable: true, complexity: 5 })
  get imageAsDataURL() {
    const imageAsBase64 = this.imageAsBase64
    const imageMimeType = this.imageMimeType

    if (!imageAsBase64 || !imageMimeType) {
      return undefined
    }

    return `data:${imageMimeType};base64,${imageAsBase64}`
  }

  set imageAsDataURL(value) {
    if (!value) {
      return
    }

    const [prefix, imageMimeType] = /^data:(\w+\/\w+);base64,/.exec(value) ?? []

    if (!prefix || !imageMimeType) {
      return
    }

    this.imageAsBase64 = value.slice(prefix.length)
    this.imageMimeType = imageMimeType
  }

  @Column({ type: String, nullable: true })
  @Field(type => String, { nullable: true })
  imageFileExtension!: string | null

  @CreateDateColumn()
  @Field(type => Date)
  createdAt!: Date

  @UpdateDateColumn()
  @Field(type => Date)
  updatedAt!: Date

  @BeforeInsert()
  protected async beforeInsert() {
    this.id = toGlobalId(this.constructor.name, uuid.v4())
    this.story ??= new Date().toISOString().slice(0, 'yyyy-MM-dd'.length)
    this.title ??= new Date().toISOString().slice('yyyy-MM-dd'.length + 1)
  }

  @BeforeUpdate()
  protected async beforeUpdate() {
    for (const promise of this.promises ?? []) {
      await promise
    }
  }
}
