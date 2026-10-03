import { GraphqlRequestError } from '../../graphql/execute-graphql';

/**
 * Agents find names easier to use than ids, so tools accept either. Ids match exactly; names
 * match ignoring letter case and surrounding spaces. Unknown values become a NOT_FOUND error
 * that lists the valid names, so the agent can correct itself.
 */
export function findByIdOrName<TEntity extends { id: string; name: string }>(
  entities: readonly TEntity[],
  idOrName: string,
  describe: { entityLabel: string; scopeLabel: string },
): TEntity {
  const normalizedName = idOrName.trim().toLowerCase();
  const match =
    entities.find((entity) => entity.id === idOrName) ??
    entities.find((entity) => entity.name.toLowerCase() === normalizedName);
  if (match !== undefined) return match;

  const availableNames = entities.map((entity) => entity.name).join(', ');
  throw new GraphqlRequestError(
    'NOT_FOUND',
    `No ${describe.entityLabel} named "${idOrName}". ${describe.scopeLabel}: ${availableNames}.`,
  );
}
