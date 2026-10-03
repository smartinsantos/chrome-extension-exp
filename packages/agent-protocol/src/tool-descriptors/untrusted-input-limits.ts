/**
 * Any website can register WebMCP tools, so everything a page sends is untrusted. These caps
 * keep a hostile or sloppy page from flooding the model's context or exhausting memory.
 * The extension applies them when it reads tools from a page, and the BFF applies them again
 * on every request.
 */
export const UNTRUSTED_INPUT_LIMITS = {
  maxToolsPerPage: 64,
  maxToolNameLength: 128,
  maxToolTitleLength: 128,
  maxToolDescriptionLength: 1024,
  maxInputSchemaBytes: 16_384,
  /** How many levels of objects or arrays may sit inside one another in an input schema. */
  maxInputSchemaJsonDepth: 24,
} as const;
