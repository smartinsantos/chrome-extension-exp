import { describe, expect, it } from 'vitest';

import {
  parseExtensionMessage,
  toolExecutionResponseSchema,
  toolListResponseSchema,
} from './extension-messages';

describe('parseExtensionMessage', () => {
  it.each([
    [{ type: 'webmcp/list-tools' }],
    [
      {
        type: 'webmcp/execute-tool',
        executionId: 'exec-1',
        toolName: 'move_card',
        toolArguments: { cardId: 'c1', toList: 'Doing' },
      },
    ],
    [{ type: 'webmcp/cancel-tool-execution', executionId: 'exec-1' }],
    [{ type: 'webmcp/tools-changed', origin: 'http://localhost:5173', toolCount: 7 }],
  ])('accepts %j', (message) => {
    expect(parseExtensionMessage(message)).toEqual(message);
  });

  it.each([
    ['an unknown type', { type: 'webmcp/delete-everything' }],
    ['a missing field', { type: 'webmcp/execute-tool', toolName: 'move_card' }],
    [
      'arguments that are not an object',
      { type: 'webmcp/execute-tool', executionId: 'e', toolName: 't', toolArguments: [] },
    ],
    ['a non-object', 'webmcp/list-tools'],
    ['null', null],
  ])('ignores %s', (_label, message) => {
    expect(parseExtensionMessage(message)).toBeUndefined();
  });
});

describe('response schemas', () => {
  it('describes a tool list, or a page without WebMCP', () => {
    expect(
      toolListResponseSchema.safeParse({
        status: 'ok',
        origin: 'http://localhost:5173',
        tools: [
          {
            name: 'list_boards',
            description: 'Lists boards',
            inputSchema: { type: 'object' },
            annotations: {
              readOnlyHint: true,
              consequentialHint: false,
              untrustedContentHint: false,
            },
            origin: 'http://localhost:5173',
          },
        ],
        rejectedTools: [{ name: 'broken', reason: 'invalid-input-schema' }],
      }).success,
    ).toBe(true);
    expect(
      toolListResponseSchema.safeParse({ status: 'unsupported', reason: 'webmcp-unavailable' })
        .success,
    ).toBe(true);
  });

  it('describes a tool result or a coded error', () => {
    expect(
      toolExecutionResponseSchema.safeParse({ status: 'ok', result: { boards: [] } }).success,
    ).toBe(true);
    expect(
      toolExecutionResponseSchema.safeParse({
        status: 'error',
        code: 'TIMEOUT',
        message: 'Too slow',
      }).success,
    ).toBe(true);
    expect(
      toolExecutionResponseSchema.safeParse({ status: 'error', code: 'MADE_UP', message: 'x' })
        .success,
    ).toBe(false);
  });
});
