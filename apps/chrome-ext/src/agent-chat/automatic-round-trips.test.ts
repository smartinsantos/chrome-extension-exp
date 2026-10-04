import type { UIMessage } from 'ai';
import { describe, expect, it } from 'vitest';

import { shouldContinueAutomatically } from './automatic-round-trips';

function userMessage(id: string): UIMessage {
  return { id, role: 'user', parts: [{ type: 'text', text: 'hi' }] };
}

function assistantToolStep(id: string): UIMessage {
  return {
    id,
    role: 'assistant',
    parts: [
      { type: 'step-start' },
      {
        type: 'tool-get_board',
        toolCallId: `call-${id}`,
        state: 'output-available',
        input: {},
        output: { ok: true },
      },
    ],
  };
}

describe('shouldContinueAutomatically', () => {
  it('continues when every tool call of the last answer has a result', () => {
    expect(shouldContinueAutomatically([userMessage('u1'), assistantToolStep('a1')], 10)).toBe(
      true,
    );
  });

  it('waits while a tool call still has no result (for example, awaiting approval)', () => {
    const pending: UIMessage = {
      id: 'a1',
      role: 'assistant',
      parts: [{ type: 'tool-get_board', toolCallId: 'c1', state: 'input-available', input: {} }],
    };

    expect(shouldContinueAutomatically([userMessage('u1'), pending], 10)).toBe(false);
  });

  it('stops after the maximum number of tool rounds since the user last spoke', () => {
    const manySteps: UIMessage = {
      id: 'a1',
      role: 'assistant',
      parts: Array.from({ length: 10 }, (_, index) => [
        { type: 'step-start' as const },
        {
          type: 'tool-get_board' as const,
          toolCallId: `c${index}`,
          state: 'output-available' as const,
          input: {},
          output: {},
        },
      ]).flat(),
    };

    expect(shouldContinueAutomatically([userMessage('u1'), manySteps], 10)).toBe(false);
    expect(shouldContinueAutomatically([userMessage('u1'), manySteps], 11)).toBe(true);
  });

  it('does not continue when the last step only has tool calls the backend already rejected', () => {
    // A call to a tool the model wasn't offered: the backend answered it with an error itself.
    const rejectedByBackend: UIMessage = {
      id: 'a1',
      role: 'assistant',
      parts: [
        { type: 'step-start' },
        {
          type: 'dynamic-tool',
          toolName: 'move_card',
          toolCallId: 'c1',
          state: 'output-error',
          input: { cardId: 'c7' },
          errorText: "Model tried to call unavailable tool 'move_card'. No tools are available.",
        },
      ],
    };

    expect(shouldContinueAutomatically([userMessage('u1'), rejectedByBackend], 10)).toBe(false);
  });

  it('still continues when the side panel ran a tool next to a rejected one', () => {
    const mixedStep = assistantToolStep('a1');
    mixedStep.parts.push({
      type: 'dynamic-tool',
      toolName: 'made_up_tool',
      toolCallId: 'c2',
      state: 'output-error',
      input: {},
      errorText: "Model tried to call unavailable tool 'made_up_tool'.",
    });

    expect(shouldContinueAutomatically([userMessage('u1'), mixedStep], 10)).toBe(true);
  });

  it('does not continue after a plain text answer', () => {
    const textAnswer: UIMessage = {
      id: 'a1',
      role: 'assistant',
      parts: [{ type: 'text', text: 'Done' }],
    };

    expect(shouldContinueAutomatically([userMessage('u1'), textAnswer], 10)).toBe(false);
  });
});
