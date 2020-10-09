import * as gql from 'graphql'
import * as ts from 'typescript'

interface GraphQLToTypeScriptConverterState {
  mode: 'simple' | 'full'
  interfacesImplementationsMap: Map<string, Set<string>>
}

const unwrapNullableTsType = (type: ts.TypeNode) => {
  if (ts.isUnionTypeNode(type)) {
    return type.types[0]
  } else {
    return type
  }
}

const gqlTypeNameToTsTypeName = (typeName: string): string => {
  const map: any = {
    'String': 'string',
    'Float': 'number',
    'Int': 'number',
    'ID': 'string',
    'Boolean': 'boolean',
  }

  return map[typeName] || typeName
}

const gqlTypeToTsType = (type: gql.TypeNode): ts.TypeNode => {
  switch (type.kind) {
    case 'ListType':
      return ts.createUnionTypeNode([ts.createArrayTypeNode(gqlTypeToTsType(type.type)), ts.createNull()])
    case 'NamedType':
      return ts.createUnionTypeNode([ts.createTypeReferenceNode(gqlTypeNameToTsTypeName(type.name.value), undefined), ts.createNull()])
    case 'NonNullType': {
      return unwrapNullableTsType(gqlTypeToTsType(type.type))
    }
  }
}

const gqlFieldToTsProperty = (definition: gql.FieldDefinitionNode | gql.InputValueDefinitionNode) => {
  const fieldType = gqlTypeToTsType(definition.type)

  return ts.createPropertySignature(
    undefined,
    definition.name.value,
    ts.isUnionTypeNode(fieldType) ?
      ts.createToken(ts.SyntaxKind.QuestionToken) : undefined,
    fieldType,
    undefined,
  )
}

const gqlFieldToTsMethod = (definition: gql.FieldDefinitionNode) => {
  return ts.createMethodSignature(
    undefined,
    [ts.createParameter(
      undefined,
      undefined,
      undefined,
      'args',
      undefined,
      ts.createTypeLiteralNode(
        definition.arguments ?.map(gqlFieldToTsProperty),
      ),
      undefined,
    )],
    gqlTypeToTsType(definition.type),
    definition.name.value,
    undefined,
  )
}

const gqlFieldToTsPropertyOrMethod = (state: GraphQLToTypeScriptConverterState, definition: gql.FieldDefinitionNode | gql.InputValueDefinitionNode) => {
  if (state.mode === 'full' && definition.kind === 'FieldDefinition' && definition.arguments?.length) {
    return gqlFieldToTsMethod(definition)
  } else {
    return gqlFieldToTsProperty(definition)
  }
}

const gqlObjectTypeToTsInterface = (state: GraphQLToTypeScriptConverterState, definition: gql.ObjectTypeDefinitionNode | gql.InputObjectTypeDefinitionNode) => {
  if (definition.kind === 'ObjectTypeDefinition') {
    for (const intf of definition.interfaces || []) {
      let implementations = state.interfacesImplementationsMap.get(intf.name.value)

      if (!implementations) {
        state.interfacesImplementationsMap.set(intf.name.value, implementations = new Set())
      }

      implementations.add(definition.name.value)
    }
  }

  return ts.createInterfaceDeclaration(
    undefined,
    [ts.createToken(ts.SyntaxKind.ExportKeyword)],
    definition.name.value,
    undefined,
    undefined,
    [
      ...(definition.kind === 'ObjectTypeDefinition' ?
        [ts.createPropertySignature(
          undefined,
          '__typename',
          state.mode === 'simple' ? ts.createToken(ts.SyntaxKind.QuestionToken) : undefined,
          ts.createTypeReferenceNode(`'${definition.name.value}'`, undefined),
          undefined,
        )] : []),
      ...(definition.fields as (gql.FieldDefinitionNode | gql.InputValueDefinitionNode)[])
        ?.map(field => gqlFieldToTsPropertyOrMethod(state, field))
        ?.map(propOrMethod => {
          if (state.mode === 'simple' && definition.kind ===
            'ObjectTypeDefinition' && ts.isPropertySignature(propOrMethod)) {
            return ts.updatePropertySignature(propOrMethod,
              undefined,
              propOrMethod.name,
              ts.createToken(ts.SyntaxKind.QuestionToken),
              propOrMethod.type,
              undefined,
            )
          } else {
            return propOrMethod
          }
        }),
    ],
  )
}

const gqlScalarTypeToTsScalarType = (definition: gql.ScalarTypeDefinitionNode) => {
  return ts.createTypeAliasDeclaration(
    undefined,
    [ts.createToken(ts.SyntaxKind.ExportKeyword)],
    definition.name.value,
    undefined,
    ts.createTypeReferenceNode('unknown', undefined),
  )
}

const gqlUnionTypeToTsUnionType = (definition: gql.UnionTypeDefinitionNode) => {
  return ts.createTypeAliasDeclaration(
    undefined,
    [ts.createToken(ts.SyntaxKind.ExportKeyword)],
    definition.name.value,
    undefined,
    ts.createUnionTypeNode(
      definition.types?.map(gqlTypeToTsType)?.map(unwrapNullableTsType) || [],
    ),
  )
}

const gqlEnumTypeToTsEnumType = (definition: gql.EnumTypeDefinitionNode) => {
  return ts.createEnumDeclaration(
    undefined,
    [ts.createToken(ts.SyntaxKind.ExportKeyword)],
    definition.name.value,
    definition.values
      ?.map(value => value.name.value)
      ?.map(valueName => ts.createEnumMember(valueName, ts.createStringLiteral(valueName))) || [],
  )
}

const gqlDefinitionToTsDeclaration = (state: GraphQLToTypeScriptConverterState, definition: gql.DefinitionNode) => {
  switch (definition.kind) {
    case 'InterfaceTypeDefinition':
      return undefined
    case 'InputObjectTypeDefinition':
    case 'ObjectTypeDefinition':
      return gqlObjectTypeToTsInterface(state, definition)
    case 'ScalarTypeDefinition':
      return gqlScalarTypeToTsScalarType(definition)
    case 'UnionTypeDefinition':
      return gqlUnionTypeToTsUnionType(definition)
    case 'EnumTypeDefinition':
      return gqlEnumTypeToTsEnumType(definition)
    default:
      console.warn(`Unsupported GraphQL-Definition ${definition.kind}`)
      return undefined
  }
}

const createGqlInterfacesAsTsUnionsFromState = (state: GraphQLToTypeScriptConverterState) => {
  return [...state.interfacesImplementationsMap]
    .map(([intf, impls]) => (
      ts.createTypeAliasDeclaration(
        undefined,
        [ts.createToken(ts.SyntaxKind.ExportKeyword)],
        intf,
        undefined,
        ts.createUnionTypeNode(
          [...impls].map(impl => ts.createTypeReferenceNode(gqlTypeNameToTsTypeName(impl), undefined)),
        ),
      )
    ))
}

const gqlToTs = (gqlSchemaAsString: string, { mode }: { mode: 'simple' | 'full' } = { mode: 'simple' }) => {
  const resultFile = ts.createSourceFile(
    'schema.ts',
    '',
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS,
  )

  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
  })

  const gqlSchema = gql.parse(gqlSchemaAsString)

  const converterState: GraphQLToTypeScriptConverterState = {
    mode,
    interfacesImplementationsMap: new Map(),
  }

  const isTruthy = <V>(v: V): v is Exclude<V, null | undefined> => !!v

  const convert = (gqlDefinition: gql.DefinitionNode) =>
    gqlDefinitionToTsDeclaration(converterState, gqlDefinition)

  // const print = (tsNode: ts.Node) =>
  //   printer.printNode(ts.EmitHint.Unspecified, tsNode, resultFile)

  const tsNodes = ts.createNodeArray([
    ...gqlSchema.definitions.map(convert).filter(isTruthy),
    ...createGqlInterfacesAsTsUnionsFromState(converterState),
  ])

  return printer.printList(ts.ListFormat.MultiLine, tsNodes, resultFile)
}

export default gqlToTs

// import { readFileSync, writeFileSync } from 'fs'

// const schemaGql = readFileSync(`${__dirname}/../../data/schema.gql`, { encoding: 'utf-8' })
// const schemaGqlTs = gqlToTs(schemaGql, { mode: 'full' })

// writeFileSync(`${__dirname}/../../data/schema.gql.client.ts`, schemaGqlTs, { encoding: 'utf-8' })
