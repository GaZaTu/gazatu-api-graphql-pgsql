import { Column, getManager } from 'typeorm'

export interface TSVectorMetadata {
  tsvectorColumn?: string
  columns?: {
    name: string
    type: any
    weight?: 'A' | 'B' | 'C' | 'D'
    strip?: boolean
    subCols?: string[]
  }[]
}

export const tsvectorMetadata = new Map<Function, TSVectorMetadata>()

export const ToTSVector = ({ weight, strip, subCols }: { weight?: 'A' | 'B' | 'C' | 'D', strip?: boolean, subCols?: string[] } = {}): PropertyDecorator => {
  return (prototype, propertyKey) => {
    const Constructor = prototype.constructor
    const metadata = tsvectorMetadata.get(Constructor) ?? {}
    const type = Reflect.getMetadata('design:type', prototype, propertyKey)

    metadata.columns = metadata.columns ?? []
    metadata.columns.push({ name: String(propertyKey), type, weight, strip, subCols })

    tsvectorMetadata.set(Constructor, metadata)
  }
}

export const TSVectorColumn = (): PropertyDecorator => {
  const convertPascalCaseToUnderscoreCase = (str = 'undefined') =>
    str.split(/(?=[A-Z])/).join('_').toLowerCase()

  return (prototype, propertyKey) => {
    Column('tsvector', { nullable: true, select: false })(prototype, propertyKey)

    const Constructor = prototype.constructor
    const metadata = tsvectorMetadata.get(Constructor) ?? {}

    metadata.tsvectorColumn = String(propertyKey)

    const tableName = convertPascalCaseToUnderscoreCase(Constructor.name)
    const indexName = `${metadata.tsvectorColumn}_gist_index`
    const triggerName = `${tableName}_tsvector_trigger`
    const triggerFunctionName = `${triggerName}_fn`

    setTimeout(async () => {
      await getManager().query(`
        CREATE INDEX IF NOT EXISTS "${indexName}" ON "${tableName}" USING gist("${metadata.tsvectorColumn}")
      `)

      await getManager().query(`
        DROP TRIGGER IF EXISTS "${triggerName}" ON "${tableName}"
      `)

      await getManager().query(`
        CREATE OR REPLACE FUNCTION "${triggerFunctionName}"()
        RETURNS TRIGGER AS
        $BODY$
        BEGIN
          NEW."${metadata.tsvectorColumn}" := ${metadata.columns?.map(c => {
        if (c.subCols) {
          return `(SELECT ${c.subCols.map(sc => {
            return `setweight(to_tsvector(coalesce("${convertPascalCaseToUnderscoreCase(c.type.name)}"."${sc}", '')), '${c.weight ?? 'D'}')`
          }).join(' || ')} FROM "${convertPascalCaseToUnderscoreCase(c.type.name)}" WHERE "id" = NEW."${c.name}Id")`
        } else {
          return `setweight(to_tsvector(coalesce(NEW."${c.name}", '')), '${c.weight ?? 'D'}')`
        }
      }).join(' || ')};

          RETURN NEW;
        END
        $BODY$
        LANGUAGE 'plpgsql' VOLATILE
      `)

      await getManager().query(`
        CREATE TRIGGER "${triggerName}"
        BEFORE INSERT OR UPDATE ON "${tableName}" FOR EACH ROW
        EXECUTE PROCEDURE "${triggerFunctionName}"()
      `)
    }, 1000)
  }
}
