import { describe, expect, it } from 'vitest';

import type { WebMcpToolDescriptor } from '../tool-descriptors/tool-descriptor-schema';
import { UNTRUSTED_INPUT_LIMITS } from '../tool-descriptors/untrusted-input-limits';
import { chatRequestBodySchema } from './chat-request-schema';

function toolDescriptor(name: string): WebMcpToolDescriptor {
  return {
    name,
    description: `Tool ${name}`,
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true, consequentialHint: false, untrustedContentHint: false },
    origin: 'http://localhost:5173',
  };
}

function validPageContext(): Record<string, unknown> {
  return {
    tabId: 42,
    url: 'http://localhost:5173/boards/launch',
    origin: 'http://localhost:5173',
    title: 'WebMCP Launch · Boards',
    isTrustedOrigin: true,
    tools: [toolDescriptor('get_board')],
  };
}

function validRequestBody(): Record<string, unknown> {
  return {
    id: 'chat-1',
    messages: [
      { id: 'message-1', role: 'user', parts: [{ type: 'text', text: 'What is overdue?' }] },
    ],
    pageContext: validPageContext(),
  };
}

function withPageContext(overrides: Record<string, unknown>): Record<string, unknown> {
  return { ...validRequestBody(), pageContext: { ...validPageContext(), ...overrides } };
}

describe('chatRequestBodySchema', () => {
  it('accepts a complete, valid request body', () => {
    const result = chatRequestBodySchema.safeParse(validRequestBody());

    expect(result.success).toBe(true);
  });

  it('rejects a body without page context', () => {
    const { pageContext: _omitted, ...bodyWithoutContext } = validRequestBody();

    expect(chatRequestBodySchema.safeParse(bodyWithoutContext).success).toBe(false);
  });

  it('rejects a page URL that is not a valid URL', () => {
    const body = withPageContext({ url: 'not a url' });

    expect(chatRequestBodySchema.safeParse(body).success).toBe(false);
  });

  it('rejects an origin that does not match the page URL', () => {
    const body = withPageContext({ origin: 'https://evil.example' });

    const result = chatRequestBodySchema.safeParse(body);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['pageContext', 'origin']);
  });

  it('rejects more tools than a page is allowed to expose', () => {
    const tooManyTools = Array.from(
      { length: UNTRUSTED_INPUT_LIMITS.maxToolsPerPage + 1 },
      (_, index) => toolDescriptor(`tool_${index}`),
    );

    expect(chatRequestBodySchema.safeParse(withPageContext({ tools: tooManyTools })).success).toBe(
      false,
    );
  });

  it('rejects a tool whose description exceeds the untrusted-input limit', () => {
    const oversizedTool = {
      ...toolDescriptor('get_board'),
      description: 'x'.repeat(UNTRUSTED_INPUT_LIMITS.maxToolDescriptionLength + 1),
    };

    expect(
      chatRequestBodySchema.safeParse(withPageContext({ tools: [oversizedTool] })).success,
    ).toBe(false);
  });

  it('rejects an empty message list', () => {
    expect(chatRequestBodySchema.safeParse({ ...validRequestBody(), messages: [] }).success).toBe(
      false,
    );
  });

  it.each([
    ['a missing id', { role: 'user', parts: [] }],
    ['an unknown role', { id: 'm1', role: 'robot', parts: [] }],
    ['parts that are not a list', { id: 'm1', role: 'user', parts: 'hello' }],
  ])('rejects a message with %s', (_label, invalidMessage) => {
    const body = { ...validRequestBody(), messages: [invalidMessage] };

    expect(chatRequestBodySchema.safeParse(body).success).toBe(false);
  });

  it('keeps message fields it does not know about, so AI SDK messages pass through intact', () => {
    const messageWithMetadata = {
      id: 'message-1',
      role: 'assistant',
      parts: [],
      metadata: { totalTokens: 120 },
    };

    const result = chatRequestBodySchema.parse({
      ...validRequestBody(),
      messages: [messageWithMetadata],
    });

    expect(result.messages[0]).toEqual(messageWithMetadata);
  });
});
