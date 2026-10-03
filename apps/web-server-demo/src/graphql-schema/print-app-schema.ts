import type { INestApplicationContext } from '@nestjs/common';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { printSchema } from 'graphql';

/** The GraphQL schema the running app serves, as SDL text (what `schema.gql` must contain). */
export function printAppSchema(app: INestApplicationContext): string {
  return `${printSchema(app.get(GraphQLSchemaHost).schema)}\n`;
}
