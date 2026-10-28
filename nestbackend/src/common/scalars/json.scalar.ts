import { GraphQLScalarType, Kind, ValueNode } from 'graphql';

function parseLiteral(ast: ValueNode): unknown {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
      return Number(ast.value);
    case Kind.LIST:
      return ast.values.map(parseLiteral);
    case Kind.OBJECT:
      return Object.fromEntries(ast.fields.map((f) => [f.name.value, parseLiteral(f.value)]));
    default:
      return null;
  }
}

/**
 * Arbitrary JSON value. Used for opaque payloads such as MatchingJob.result,
 * which are structured objects that the built-in `String` scalar cannot serialize.
 * Usage: `@Field(() => JSONScalar)`.
 */
export const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON value',
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral,
});
