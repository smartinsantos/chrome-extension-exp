import { describe, expect, it } from 'vitest';

import { normalizeToolDescriptors } from './normalize-tool-descriptors';
import { UNTRUSTED_INPUT_LIMITS } from './untrusted-input-limits';

const PAGE_ORIGIN = 'http://localhost:5173';

function rawTool(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'move_card',
    description: 'Move a card to another list.',
    inputSchema: {
      type: 'object',
      properties: { cardId: { type: 'string' } },
      required: ['cardId'],
    },
    ...overrides,
  };
}

/** Builds a valid object schema whose JSON nesting (objects inside objects) is exactly `jsonDepth`. */
function inputSchemaWithJsonDepth(jsonDepth: number): Record<string, unknown> {
  let innermostValue: Record<string, unknown> = {};
  for (let level = 2; level < jsonDepth; level++) {
    innermostValue = { nested: innermostValue };
  }
  return { type: 'object', properties: {}, 'x-extra': innermostValue };
}

describe('normalizeToolDescriptors', () => {
  it('keeps a valid object input schema exactly as the page sent it', () => {
    const { tools, rejectedTools } = normalizeToolDescriptors([rawTool()], PAGE_ORIGIN);

    expect(rejectedTools).toEqual([]);
    expect(tools[0]?.inputSchema).toEqual(rawTool().inputSchema);
  });

  it('parses an input schema that arrives as a JSON string', () => {
    const schemaAsJson = JSON.stringify(rawTool().inputSchema);

    const { tools } = normalizeToolDescriptors(
      [rawTool({ inputSchema: schemaAsJson })],
      PAGE_ORIGIN,
    );

    expect(tools[0]?.inputSchema).toEqual(rawTool().inputSchema);
  });

  it('uses an empty object schema when the tool takes no input', () => {
    const { tools } = normalizeToolDescriptors([rawTool({ inputSchema: undefined })], PAGE_ORIGIN);

    expect(tools[0]?.inputSchema).toEqual({ type: 'object', properties: {} });
  });

  it('adds the missing "type: object" to a schema that only lists properties', () => {
    const { tools } = normalizeToolDescriptors(
      [rawTool({ inputSchema: { properties: { id: { type: 'string' } } } })],
      PAGE_ORIGIN,
    );

    expect(tools[0]?.inputSchema).toEqual({
      type: 'object',
      properties: { id: { type: 'string' } },
    });
  });

  it.each([
    ['invalid JSON text', '{ not json'],
    ['a non-object schema', { type: 'string' }],
    ['a JSON array', '[1, 2]'],
    ['a number', 42],
  ])('rejects %s as an invalid input schema', (_label, inputSchema) => {
    const { tools, rejectedTools } = normalizeToolDescriptors(
      [rawTool({ inputSchema })],
      PAGE_ORIGIN,
    );

    expect(tools).toEqual([]);
    expect(rejectedTools).toEqual([{ name: 'move_card', reason: 'invalid-input-schema' }]);
  });

  it('rejects an input schema larger than the size limit', () => {
    const hugeDescription = 'x'.repeat(UNTRUSTED_INPUT_LIMITS.maxInputSchemaBytes);
    const inputSchema = {
      type: 'object',
      properties: { note: { type: 'string', description: hugeDescription } },
    };

    const { rejectedTools } = normalizeToolDescriptors([rawTool({ inputSchema })], PAGE_ORIGIN);

    expect(rejectedTools).toEqual([{ name: 'move_card', reason: 'input-schema-too-large' }]);
  });

  it('rejects an input schema nested deeper than the depth limit', () => {
    const inputSchema = inputSchemaWithJsonDepth(
      UNTRUSTED_INPUT_LIMITS.maxInputSchemaJsonDepth + 1,
    );

    const { rejectedTools } = normalizeToolDescriptors([rawTool({ inputSchema })], PAGE_ORIGIN);

    expect(rejectedTools).toEqual([{ name: 'move_card', reason: 'input-schema-too-deep' }]);
  });

  it('rejects an extremely deep input schema without overflowing the call stack', () => {
    const inputSchema = inputSchemaWithJsonDepth(100_000);

    const { rejectedTools } = normalizeToolDescriptors([rawTool({ inputSchema })], PAGE_ORIGIN);

    expect(rejectedTools).toEqual([{ name: 'move_card', reason: 'input-schema-too-deep' }]);
  });

  it('rejects a self-referencing input schema instead of throwing', () => {
    const inputSchema: Record<string, unknown> = { type: 'object', properties: {} };
    inputSchema['self'] = inputSchema;

    const { rejectedTools } = normalizeToolDescriptors([rawTool({ inputSchema })], PAGE_ORIGIN);

    expect(rejectedTools).toEqual([{ name: 'move_card', reason: 'input-schema-too-deep' }]);
  });

  it('rejects a schema that reuses the same object many times instead of walking every path', () => {
    let sharedLevel: Record<string, unknown> = {};
    for (let level = 0; level < 20; level++) {
      const fanOut: Record<string, unknown> = {};
      for (let branch = 0; branch < 50; branch++) fanOut[`branch${branch}`] = sharedLevel;
      sharedLevel = fanOut;
    }
    const inputSchema = { type: 'object', properties: {}, 'x-extra': sharedLevel };

    const { rejectedTools } = normalizeToolDescriptors([rawTool({ inputSchema })], PAGE_ORIGIN);

    expect(rejectedTools).toEqual([{ name: 'move_card', reason: 'input-schema-too-large' }]);
  }, 1000);

  it('accepts an input schema nested exactly at the depth limit', () => {
    const inputSchema = inputSchemaWithJsonDepth(UNTRUSTED_INPUT_LIMITS.maxInputSchemaJsonDepth);

    const { tools } = normalizeToolDescriptors([rawTool({ inputSchema })], PAGE_ORIGIN);

    expect(tools).toHaveLength(1);
  });

  it('truncates a long description to the limit and marks it as truncated', () => {
    const longDescription = 'Moves a card. '.repeat(500);

    const { tools } = normalizeToolDescriptors(
      [rawTool({ description: longDescription })],
      PAGE_ORIGIN,
    );

    const description = tools[0]?.description ?? '';
    expect(description).toHaveLength(UNTRUSTED_INPUT_LIMITS.maxToolDescriptionLength);
    expect(description.endsWith('… [truncated]')).toBe(true);
  });

  it('defaults every missing annotation to false', () => {
    const { tools } = normalizeToolDescriptors([rawTool()], PAGE_ORIGIN);

    expect(tools[0]?.annotations).toEqual({
      readOnlyHint: false,
      consequentialHint: false,
      untrustedContentHint: false,
    });
  });

  it('turns truthy annotation values into real booleans and ignores unknown ones', () => {
    const { tools } = normalizeToolDescriptors(
      [rawTool({ annotations: { readOnlyHint: 'yes', consequentialHint: 0, madeUpHint: true } })],
      PAGE_ORIGIN,
    );

    expect(tools[0]?.annotations).toEqual({
      readOnlyHint: true,
      consequentialHint: false,
      untrustedContentHint: false,
    });
  });

  it('keeps the first 64 tools by name and reports the rest as over the limit', () => {
    const rawTools = Array.from({ length: 70 }, (_, index) =>
      rawTool({ name: `tool_${String(index).padStart(2, '0')}` }),
    );

    const { tools, rejectedTools } = normalizeToolDescriptors(rawTools.toReversed(), PAGE_ORIGIN);

    expect(tools).toHaveLength(UNTRUSTED_INPUT_LIMITS.maxToolsPerPage);
    expect(tools[0]?.name).toBe('tool_00');
    expect(tools.at(-1)?.name).toBe('tool_63');
    expect(rejectedTools.map((rejected) => rejected.reason)).toEqual(
      Array.from({ length: 6 }, () => 'over-tool-limit'),
    );
  });

  it.each([
    ['null', null],
    ['a string', 'move_card'],
    ['an object without a name', { description: 'nameless' }],
    ['an object with an empty name', { name: '   ', description: 'blank' }],
    ['an object without a description', { name: 'move_card' }],
  ])('rejects %s as an invalid shape', (_label, rawEntry) => {
    const { tools, rejectedTools } = normalizeToolDescriptors([rawEntry], PAGE_ORIGIN);

    expect(tools).toEqual([]);
    expect(rejectedTools).toHaveLength(1);
    expect(rejectedTools[0]?.reason).toBe('invalid-shape');
  });

  it('labels rejected entries without a usable name as "(unnamed)"', () => {
    const { rejectedTools } = normalizeToolDescriptors([null], PAGE_ORIGIN);

    expect(rejectedTools).toEqual([{ name: '(unnamed)', reason: 'invalid-shape' }]);
  });

  it('rejects names longer than the name limit', () => {
    const longName = 'n'.repeat(UNTRUSTED_INPUT_LIMITS.maxToolNameLength + 1);

    const { rejectedTools } = normalizeToolDescriptors([rawTool({ name: longName })], PAGE_ORIGIN);

    expect(rejectedTools).toEqual([{ name: longName, reason: 'name-too-long' }]);
  });

  it('keeps the first of two tools with the same name and reports the duplicate', () => {
    const { tools, rejectedTools } = normalizeToolDescriptors(
      [rawTool({ description: 'first' }), rawTool({ description: 'second' })],
      PAGE_ORIGIN,
    );

    expect(tools).toHaveLength(1);
    expect(tools[0]?.description).toBe('first');
    expect(rejectedTools).toEqual([{ name: 'move_card', reason: 'duplicate-name' }]);
  });

  it('stamps the page origin on every kept tool', () => {
    const { tools } = normalizeToolDescriptors(
      [rawTool(), rawTool({ name: 'archive_card' })],
      PAGE_ORIGIN,
    );

    expect(tools.map((tool) => tool.origin)).toEqual([PAGE_ORIGIN, PAGE_ORIGIN]);
  });

  it('keeps an optional title when the page provides one', () => {
    const { tools } = normalizeToolDescriptors([rawTool({ title: 'Move card' })], PAGE_ORIGIN);

    expect(tools[0]?.title).toBe('Move card');
  });
});
