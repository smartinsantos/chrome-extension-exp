import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { GraphqlRequestError } from '../graphql/execute-graphql';
import { useWebMcpTool } from './use-webmcp-tool';
import { defineWebMcpTool } from './webmcp-tool-definition';

interface CapturedRegistration {
  tool: WebMCP.ModelContextTool;
  signal: AbortSignal | undefined;
}

function installFakeModelContext() {
  const registrations: CapturedRegistration[] = [];
  const fakeModelContext = {
    registerTool: vi.fn<WebMCP.ModelContext['registerTool']>(
      (tool: WebMCP.ModelContextTool, options?: WebMCP.ModelContextRegisterToolOptions) => {
        registrations.push({ tool, signal: options?.signal });
        return Promise.resolve();
      },
    ),
  };
  Object.defineProperty(document, 'modelContext', { value: fakeModelContext, configurable: true });
  return { registrations, fakeModelContext };
}

const greetTool = defineWebMcpTool({
  name: 'greet_person',
  description: 'Say hello to someone.',
  annotations: { readOnlyHint: true },
  inputSchema: z.object({ personName: z.string().min(1).describe('Who to greet') }),
  execute: async ({ personName }, context: { greeting: string }) =>
    Promise.resolve({ message: `${context.greeting}, ${personName}!` }),
});

async function runRegisteredTool(registration: CapturedRegistration | undefined, input: unknown) {
  if (registration === undefined) throw new Error('No tool registered');
  return registration.tool.execute(input as Record<string, unknown>, {
    signal: new AbortController().signal,
  });
}

describe('useWebMcpTool', () => {
  let fake: ReturnType<typeof installFakeModelContext>;

  beforeEach(() => {
    fake = installFakeModelContext();
  });

  afterEach(() => {
    Reflect.deleteProperty(document, 'modelContext');
  });

  it('registers the tool with its JSON input schema when the component mounts', () => {
    renderHook(() => useWebMcpTool(greetTool, { greeting: 'Hello' }));

    const registeredTool = fake.registrations[0]?.tool;
    expect(registeredTool).toMatchObject({
      name: 'greet_person',
      description: 'Say hello to someone.',
      annotations: { readOnlyHint: true },
      inputSchema: {
        type: 'object',
        properties: { personName: { type: 'string', minLength: 1, description: 'Who to greet' } },
        required: ['personName'],
      },
    });
    expect(registeredTool?.inputSchema).not.toHaveProperty('$schema');
  });

  it('unregisters the tool (by aborting its signal) when the component unmounts', () => {
    const { unmount } = renderHook(() => useWebMcpTool(greetTool, { greeting: 'Hello' }));
    const registrationSignal = fake.registrations[0]?.signal;

    unmount();

    expect(registrationSignal?.aborted).toBe(true);
  });

  it('keeps one registration across re-renders and always runs with the latest context', async () => {
    const { rerender } = renderHook(({ greeting }) => useWebMcpTool(greetTool, { greeting }), {
      initialProps: { greeting: 'Hello' },
    });

    rerender({ greeting: 'Hola' });

    expect(fake.fakeModelContext.registerTool).toHaveBeenCalledOnce();
    expect(await runRegisteredTool(fake.registrations[0], { personName: 'Ada' })).toEqual({
      message: 'Hola, Ada!',
    });
  });

  it('answers invalid input with a structured error instead of running the tool', async () => {
    renderHook(() => useWebMcpTool(greetTool, { greeting: 'Hello' }));

    const result = await runRegisteredTool(fake.registrations[0], { personName: '' });

    expect(result).toMatchObject({ error: { code: 'INVALID_INPUT' } });
    expect(JSON.stringify(result)).toContain('personName');
  });

  it('turns server errors into structured errors the agent can read', async () => {
    const failingTool = defineWebMcpTool({
      name: 'always_fails',
      description: 'Fails.',
      inputSchema: z.object({}),
      execute: () =>
        Promise.reject(new GraphqlRequestError('NOT_FOUND', 'Card "x" was not found.')),
    });
    renderHook(() => useWebMcpTool(failingTool, undefined));

    expect(await runRegisteredTool(fake.registrations[0], {})).toEqual({
      error: { code: 'NOT_FOUND', message: 'Card "x" was not found.' },
    });
  });

  it('does nothing in browsers without WebMCP', () => {
    Reflect.deleteProperty(document, 'modelContext');

    expect(() => renderHook(() => useWebMcpTool(greetTool, { greeting: 'Hi' }))).not.toThrow();
  });

  it('swaps registrations when the component switches to a different tool', () => {
    const otherTool = defineWebMcpTool({ ...greetTool, name: 'greet_loudly' });
    const { rerender } = renderHook(({ tool }) => useWebMcpTool(tool, { greeting: 'Hi' }), {
      initialProps: { tool: greetTool },
    });

    rerender({ tool: otherTool });

    expect(fake.registrations.map((registration) => registration.tool.name)).toEqual([
      'greet_person',
      'greet_loudly',
    ]);
    expect(fake.registrations[0]?.signal?.aborted).toBe(true);
    expect(fake.registrations[1]?.signal?.aborted).toBe(false);
  });
});
