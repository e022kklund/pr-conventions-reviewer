import Anthropic from '@anthropic-ai/sdk';
import { LlmError } from '../errors.js';
import type { ReviewPrompt } from '../review/types.js';

export const TOOL_NAME = 'report_findings';

// The JSON schema the model must follow. Its answer is still validated by
// review/parse-findings.ts, because the schema is a request, not a guarantee.
const REPORT_FINDINGS_TOOL: Anthropic.Tool = {
  name: TOOL_NAME,
  description: 'Report the rule violations found in the pull request. Use an empty list if there are none.',
  input_schema: {
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
        },
      },
    },
    required: ['findings'],
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
 * The model is forced to answer through the report_findings tool so the
 * answer is JSON rather than free text.
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
      tools: [REPORT_FINDINGS_TOOL],
      tool_choice: { type: 'tool', name: TOOL_NAME },
    });
  } catch (error) {
    throw new LlmError(describeApiError(error, options.model), { cause: error });
  }

  if (message.stop_reason === 'max_tokens') {
    throw new LlmError(
      `The model ran out of output tokens (${String(options.maxOutputTokens)}) before it finished the review.`,
    );
  }

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use' && block.name === TOOL_NAME,
  );
  if (!toolUse) {
    throw new LlmError('The model did not return any findings.');
  }

  const input: unknown = toolUse.input;
  return typeof input === 'object' && input !== null && 'findings' in input
    ? input.findings
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
