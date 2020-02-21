import * as gql from 'graphql'

const jsScalarTypes = [String, Number, Boolean, Date]

const normalizeNamedTypeVariable = (schema: gql.GraphQLSchema, type: gql.GraphQLNamedType | (new () => any) | null | undefined, variable: { [key: string]: any }) => {
  if (!(type instanceof Function) && type?.astNode?.kind === 'InputObjectTypeDefinition') {
    return type.astNode.fields
      // ?.map(field => ({ fieldName: field.name.value, value: variable[field.name.value] }))
      ?.map(field => normalizeVariableByType(schema, field.type, variable[field.name.value]))
      ?.reduce((o, { fieldName, value }) => { o[fieldName] = value; return o; }, {} as typeof variable)
  } else if (type?.name) {
    const metadataStorage = (global as any).TypeGraphQLMetadataStorage
    const findHandler = (inputType: any) => inputType.name === type?.name
    const inputType =
      metadataStorage?.inputTypes?.find(findHandler) ||
      metadataStorage?.objectTypes?.find(findHandler) ||
      metadataStorage?.interfaceTypes?.find(findHandler) ||
      metadataStorage?.argumentTypes?.find(findHandler)

    if (inputType) {
      return (inputType.fields as any[] | undefined)
        ?.map(field => ({ fieldName: field.name, value: normalizeVariableByType(schema, field.getType(), variable[field.name]) }))
        ?.reduce((o, { fieldName, value }) => { o[fieldName] = value; return o; }, {} as typeof variable)
    }
  }

  return variable
}

const normalizeVariableByType = (schema: gql.GraphQLSchema, type: gql.TypeNode | (new () => any) | gql.GraphQLScalarType, variable: any): any => {
  if (type instanceof gql.GraphQLScalarType) {
    return variable
  }

  if (type instanceof Function) {
    if (jsScalarTypes.includes(type as any)) {
      return variable
    } else {
      return normalizeNamedTypeVariable(schema, type, variable)
    }
  }

  switch (type.kind) {
    case 'ListType':
      return (variable as any[] | undefined)?.map(item => normalizeVariableByType(schema, type.type, item))
    case 'NamedType':
      return normalizeNamedTypeVariable(schema, schema.getType(type.name.value), variable)
    case 'NonNullType':
      return variable && normalizeVariableByType(schema, type.type, variable)
  }
}

const normalizeVariablesForOperationDefinition = (schema: gql.GraphQLSchema, definition: gql.OperationDefinitionNode, variables: { [key: string]: any }) => {
  if (definition.variableDefinitions) {
    for (const variableDefinition of definition.variableDefinitions) {
      const variableName = variableDefinition.variable.name.value
      const variableValue = normalizeVariableByType(schema, variableDefinition.type, variables[variableName])

      variables[variableName] = variableValue
    }
  }
}

const normalizeVariablesForOperationDefinitions = (schema: gql.GraphQLSchema, definitions: readonly gql.DefinitionNode[], variables: { [key: string]: any }) => {
  for (const definition of definitions) {
    if (definition.kind === 'OperationDefinition') {
      normalizeVariablesForOperationDefinition(schema, definition, variables)
    }
  }
}

export default normalizeVariablesForOperationDefinitions
