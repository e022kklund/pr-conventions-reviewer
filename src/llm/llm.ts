import Anthropic from '@anthropic-ai/sdk';
import { LlmError } from '../errors.js';
import type { ReviewPrompt } from '../review/types.js';

// The JSON schema the model's answer must follow. The API enforces it, but the
// answer is still validated by review/parse-findings.ts before it is used.
const FINDINGS_FORMAT: Anthropic.JSONOutputFormat = {
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: {
      findings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path from the <file path="..."> attribute.' },
            line: { type: 'integer', description: 'Line number shown at the start of the diff line.' },
            rule: { type: 'string', description: 'The rule that is violated.' },
            message: { type: 'string', description: 'What is wrong and what the rule expects.' },
          },
          required: ['path', 'line', 'rule', 'message'],
          additionalProperties: false,
        },
      },
    },
    required: ['findings'],
    additionalProperties: false,
  },
};

export interface LlmOptions {
  model: string;
  maxOutputTokens: number;
}

export function createLlmClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey });
}

/**
 * Asks the model for findings and returns its raw, unvalidated answer.
 * The answer is requested as JSON that follows FINDINGS_FORMAT.
 */
export async function requestFindings(
  client: Anthropic,
  prompt: ReviewPrompt,
  options: LlmOptions,
): Promise<unknown> {
  let message: Anthropic.Message;
  try {
    message = await client.messages.create({
      model: options.model,
      max_tokens: options.maxOutputTokens,
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
      output_config: { format: FINDINGS_FORMAT },
    });
  } catch (error) {
    throw new LlmError(describeApiError(error, options.model), { cause: error });
  }

  if (message.stop_reason === 'max_tokens') {
    throw new LlmError(
      `The model ran out of output tokens (${String(options.maxOutputTokens)}) before it finished the review.`,
    );
  }
  if (message.stop_reason === 'refusal') {
    throw new LlmError('The model declined to review this pull request.');
  }

  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');
  return findingsFromJson(text);
}

// Returns the "findings" field of the model's JSON answer, or undefined if there is none.
function findingsFromJson(text: string): unknown {
  let answer: unknown;
  try {
    answer = JSON.parse(text);
  } catch {
    throw new LlmError('The model did not answer with valid JSON.');
  }
  return typeof answer === 'object' && answer !== null && 'findings' in answer
    ? answer.findings
    : undefined;
}

// Turns API errors into messages a user can act on. Never includes the request itself.
function describeApiError(error: unknown, model: string): string {
  if (error instanceof Anthropic.AuthenticationError) {
    return 'The Anthropic API rejected the API key. Check the ANTHROPIC_API_KEY secret.';
  }
  if (error instanceof Anthropic.NotFoundError) {
    return `The model "${model}" was not found. Check the "model" input.`;
  }
  if (error instanceof Anthropic.RateLimitError) {
    return 'The Anthropic API rate limit was reached. The review will run again on the next push.';
  }
  if (error instanceof Anthropic.APIError) {
    // apiMessage and errorCode come from the API's response body, never from our request.
    const code = error.errorCode ?? error.type;
    const reason = [code, error.apiMessage].filter((part) => part !== null && part !== '').join(': ');
    return `The Anthropic API returned an error (status ${String(error.status)})${reason === '' ? '.' : `: ${reason}`}`;
  }
  return 'Could not reach the Anthropic API.';
}
