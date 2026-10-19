import { describe, expect, it } from 'vitest';
import { ConfigError } from '../errors.js';
import { DEFAULT_MODEL, DEFAULT_RULES_PATH, parseConfig } from './config.js';

const required = {
  'anthropic-api-key': 'sk-ant-secret',
  'github-token': 'ghs_secret',
};

function inputs(values: Record<string, string>) {
  return (name: string): string => values[name] ?? '';
}

describe('parseConfig', () => {
  it('uses defaults when only the required inputs are set', () => {
    expect(parseConfig(inputs(required))).toEqual({
      anthropicApiKey: 'sk-ant-secret',
      githubToken: 'ghs_secret',
      rulesPath: DEFAULT_RULES_PATH,
      model: DEFAULT_MODEL,
      failOnFindings: false,
    });
  });

  it('reads all inputs and trims whitespace', () => {
    const config = parseConfig(
      inputs({
        ...required,
        'rules-path': ' .github/review-rules.md ',
        model: 'some-model',
        'fail-on-findings': 'TRUE',
      }),
    );

    expect(config.rulesPath).toBe('.github/review-rules.md');
    expect(config.model).toBe('some-model');
    expect(config.failOnFindings).toBe(true);
  });

  it.each(['anthropic-api-key', 'github-token'])('throws ConfigError when %s is missing', (name) => {
    const values: Record<string, string> = { ...required, [name]: '   ' };

    expect(() => parseConfig(inputs(values))).toThrow(ConfigError);
    expect(() => parseConfig(inputs(values))).toThrow(name);
  });

  it('throws ConfigError for an invalid boolean', () => {
    const values = { ...required, 'fail-on-findings': 'yes' };

    expect(() => parseConfig(inputs(values))).toThrow(ConfigError);
  });

  it('never puts input values in error messages', () => {
    const values = { ...required, 'fail-on-findings': 'sk-ant-secret' };

    let message = '';
    try {
      parseConfig(inputs(values));
    } catch (error) {
      message = error instanceof Error ? error.message : '';
    }

    expect(message).toContain('fail-on-findings');
    expect(message).not.toContain('secret');
  });
});
