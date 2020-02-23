import { Entity, PrimaryColumn, getManager } from 'typeorm'

@Entity()
export class SingleEntity {
  constructor(init?: Partial<SingleEntity>) {
    Object.assign(this, init)
  }

  @PrimaryColumn()
  id!: string
}

setTimeout(async () => {
  const existingSingleEntity = await getManager().findOne(SingleEntity, '1')

  if (!existingSingleEntity) {
    await getManager().save(new SingleEntity({ id: '1' }))
  }
}, 10000)
