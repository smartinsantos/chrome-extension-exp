import { describe, expect, it } from 'vitest';

import { webMcpToolDescriptorSchema } from './tool-descriptor-schema';

const descriptor = {
  name: 'move_card',
  description: 'Move a card',
  inputSchema: { type: 'object' },
  annotations: { readOnlyHint: false, consequentialHint: false, untrustedContentHint: false },
  origin: 'http://localhost:5173',
};

describe('webMcpToolDescriptorSchema', () => {
  it('keeps a tool name exactly as the page registered it, including surrounding spaces', () => {
    const parsed = webMcpToolDescriptorSchema.parse({ ...descriptor, name: '  move card  ' });

    expect(parsed.name).toBe('  move card  ');
  });

  it('rejects a name made only of whitespace', () => {
    expect(webMcpToolDescriptorSchema.safeParse({ ...descriptor, name: '   ' }).success).toBe(
      false,
    );
  });
});
