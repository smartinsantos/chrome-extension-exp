import { describe, expect, it } from 'vitest';

import {
  MODEL_TOOL_NAME_PATTERN,
  UnknownToolNameError,
  createToolNameCodec,
} from './tool-name-codec';

describe('createToolNameCodec', () => {
  it('keeps names that are already safe for model providers unchanged', () => {
    const codec = createToolNameCodec(['move_card', 'list-boards']);

    expect(codec.toModelToolName('move_card')).toBe('move_card');
    expect(codec.toModelToolName('list-boards')).toBe('list-boards');
  });

  it('replaces unsafe characters and adds a hash suffix so the change is reversible', () => {
    const codec = createToolNameCodec(['cards.move']);

    const modelToolName = codec.toModelToolName('cards.move');

    expect(modelToolName).toMatch(MODEL_TOOL_NAME_PATTERN);
    expect(modelToolName).toMatch(/^cards_move_[0-9a-z]{7}$/);
    expect(codec.toWebToolName(modelToolName)).toBe('cards.move');
  });

  it('gives names that sanitize to the same text distinct model names that each decode back', () => {
    const webToolNames = ['cards.move', 'cards_move', 'cards move'];
    const codec = createToolNameCodec(webToolNames);

    const modelToolNames = webToolNames.map((name) => codec.toModelToolName(name));

    expect(new Set(modelToolNames).size).toBe(webToolNames.length);
    for (const [index, modelToolName] of modelToolNames.entries()) {
      expect(modelToolName).toMatch(MODEL_TOOL_NAME_PATTERN);
      expect(codec.toWebToolName(modelToolName)).toBe(webToolNames[index]);
    }
  });

  it('produces the same mapping no matter what order the names arrive in', () => {
    const webToolNames = ['cards.move', 'cards_move', 'open board', 'get_board'];
    const codecFromExtension = createToolNameCodec(webToolNames);
    const codecFromServer = createToolNameCodec(webToolNames.toReversed());

    for (const name of webToolNames) {
      expect(codecFromServer.toModelToolName(name)).toBe(codecFromExtension.toModelToolName(name));
    }
  });

  it('shortens names longer than 64 characters while keeping two long names distinct', () => {
    const sharedPrefix = 'a'.repeat(70);
    const firstLongName = `${sharedPrefix}_first`;
    const secondLongName = `${sharedPrefix}_second`;
    const codec = createToolNameCodec([firstLongName, secondLongName]);

    const firstModelName = codec.toModelToolName(firstLongName);
    const secondModelName = codec.toModelToolName(secondLongName);

    expect(firstModelName).toMatch(MODEL_TOOL_NAME_PATTERN);
    expect(secondModelName).toMatch(MODEL_TOOL_NAME_PATTERN);
    expect(firstModelName).not.toBe(secondModelName);
    expect(codec.toWebToolName(secondModelName)).toBe(secondLongName);
  });

  it('gives empty and whitespace-only names a valid fallback name', () => {
    const codec = createToolNameCodec(['', '   ']);

    expect(codec.toModelToolName('')).toMatch(/^tool_[0-9a-z]{7}$/);
    expect(codec.toModelToolName('   ')).toMatch(/^tool_[0-9a-z]{7}$/);
    expect(codec.toModelToolName('')).not.toBe(codec.toModelToolName('   '));
  });

  it('returns undefined when decoding a model name it never produced', () => {
    const codec = createToolNameCodec(['move_card']);

    expect(codec.toWebToolName('delete_everything')).toBeUndefined();
  });

  it('throws a descriptive error when encoding a name outside its tool set', () => {
    const codec = createToolNameCodec(['move_card']);

    expect(() => codec.toModelToolName('archive_card')).toThrow(UnknownToolNameError);
    expect(() => codec.toModelToolName('archive_card')).toThrow(/archive_card/);
  });

  it('ignores duplicate web names instead of failing', () => {
    const codec = createToolNameCodec(['move_card', 'move_card']);

    expect(codec.toModelToolName('move_card')).toBe('move_card');
  });

  it('never lets a name that is already safe collide with a hashed name', () => {
    const codec = createToolNameCodec(['cards.move']);
    const hashedName = codec.toModelToolName('cards.move');
    const codecWithLookalike = createToolNameCodec(['cards.move', hashedName]);

    expect(codecWithLookalike.toModelToolName(hashedName)).not.toBe(
      codecWithLookalike.toModelToolName('cards.move'),
    );
    expect(codecWithLookalike.toWebToolName(codecWithLookalike.toModelToolName('cards.move'))).toBe(
      'cards.move',
    );
  });
});
