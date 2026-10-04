export type ToolArgumentsParseResult =
  { isValid: true; toolArguments: Record<string, unknown> } | { isValid: false; problem: string };

export function parseToolArguments(argumentsText: string): ToolArgumentsParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(argumentsText);
  } catch {
    return { isValid: false, problem: 'Arguments must be a JSON object, like {"cardId": "abc"}.' };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { isValid: false, problem: 'Arguments must be a JSON object, like {"cardId": "abc"}.' };
  }
  return { isValid: true, toolArguments: Object.fromEntries(Object.entries(parsed)) };
}

const PLACEHOLDER_BY_JSON_TYPE: Record<string, unknown> = {
  string: '',
  number: 0,
  integer: 0,
  boolean: false,
  array: [],
  object: {},
};

/** A starting point for the arguments editor: the schema's required fields with empty values. */
export function buildArgumentsTemplate(inputSchema: Record<string, unknown>): string {
  const properties = inputSchema['properties'];
  const required = inputSchema['required'];
  if (typeof properties !== 'object' || properties === null || !Array.isArray(required))
    return '{}';

  const template = Object.fromEntries(
    required
      .filter((name): name is string => typeof name === 'string')
      .map((name) => {
        const propertySchema: unknown = Reflect.get(properties, name);
        const jsonType =
          typeof propertySchema === 'object' && propertySchema !== null
            ? Reflect.get(propertySchema, 'type')
            : undefined;
        return [
          name,
          typeof jsonType === 'string' ? (PLACEHOLDER_BY_JSON_TYPE[jsonType] ?? null) : null,
        ];
      }),
  );
  return JSON.stringify(template, null, 2);
}
