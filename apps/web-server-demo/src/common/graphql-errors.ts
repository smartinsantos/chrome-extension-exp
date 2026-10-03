import { GraphQLError } from 'graphql';

/** The requested entity doesn't exist. Clients (and the AI agent) can check `extensions.code`. */
export function notFoundError(entityName: string, id: string): GraphQLError {
  return new GraphQLError(`${entityName} "${id}" was not found.`, {
    extensions: { code: 'NOT_FOUND', entityName, id },
  });
}

/** The request is well-formed but asks for something invalid; `details` helps the caller fix it. */
export function badUserInputError(
  message: string,
  details: Record<string, unknown> = {},
): GraphQLError {
  return new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT', ...details } });
}
