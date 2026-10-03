import { stableHash } from './stable-hash';

/** The tool-name format accepted by every mainstream model provider. */
export const MODEL_TOOL_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

const MAX_MODEL_TOOL_NAME_LENGTH = 64;
const HASH_SUFFIX_LENGTH = 8; // "_" followed by a 7-character hash
const FALLBACK_BASE_NAME = 'tool';

export class UnknownToolNameError extends Error {
  constructor(webToolName: string) {
    super(`"${webToolName}" is not one of the tools this codec was created for.`);
    this.name = 'UnknownToolNameError';
  }
}

export interface ToolNameCodec {
  /** The name to show the model for a tool the web page registered. */
  toModelToolName(webToolName: string): string;
  /** The original web page tool name for a name the model used, if it is one we produced. */
  toWebToolName(modelToolName: string): string | undefined;
}

/**
 * Web pages can name their WebMCP tools anything, but model providers only accept short
 * names made of letters, digits, `_` and `-`. This codec maps each page tool name to a
 * provider-safe name and back.
 *
 * The mapping depends only on the set of names, never on their order, so the extension and
 * the BFF can each build their own codec from the same tool list and always agree.
 */
export function createToolNameCodec(webToolNames: readonly string[]): ToolNameCodec {
  const uniqueSortedWebToolNames = [...new Set(webToolNames)].toSorted();
  const modelNameByWebName = new Map<string, string>();
  const webNameByModelName = new Map<string, string>();

  // Names that are already safe keep their name, so they are reserved before anything else.
  for (const webToolName of uniqueSortedWebToolNames) {
    if (MODEL_TOOL_NAME_PATTERN.test(webToolName)) {
      modelNameByWebName.set(webToolName, webToolName);
      webNameByModelName.set(webToolName, webToolName);
    }
  }

  for (const webToolName of uniqueSortedWebToolNames) {
    if (modelNameByWebName.has(webToolName)) continue;

    const modelToolName = findUnusedHashedName(webToolName, webNameByModelName);
    modelNameByWebName.set(webToolName, modelToolName);
    webNameByModelName.set(modelToolName, webToolName);
  }

  return {
    toModelToolName(webToolName) {
      const modelToolName = modelNameByWebName.get(webToolName);
      if (modelToolName === undefined) throw new UnknownToolNameError(webToolName);
      return modelToolName;
    },
    toWebToolName(modelToolName) {
      return webNameByModelName.get(modelToolName);
    },
  };
}

function findUnusedHashedName(
  webToolName: string,
  takenModelNames: ReadonlyMap<string, string>,
): string {
  const baseName = toSafeBaseName(webToolName).slice(
    0,
    MAX_MODEL_TOOL_NAME_LENGTH - HASH_SUFFIX_LENGTH,
  );

  for (let attempt = 0; ; attempt++) {
    const hashInput = attempt === 0 ? webToolName : `${webToolName}#${attempt}`;
    const candidateName = `${baseName}_${stableHash(hashInput)}`;
    if (!takenModelNames.has(candidateName)) return candidateName;
  }
}

function toSafeBaseName(webToolName: string): string {
  const safeName = webToolName
    .trim()
    .replaceAll(/[^a-zA-Z0-9_-]+/g, '_')
    .replaceAll(/^_+|_+$/g, '');
  return safeName === '' ? FALLBACK_BASE_NAME : safeName;
}
