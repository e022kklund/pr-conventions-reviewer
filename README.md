# PR Conventions Reviewer

A GitHub Action that reviews pull requests against your repository's own written rules (for example `CLAUDE.md`) and posts the findings as a review with inline comments.

> **Status:** under development. The action currently reads and validates its inputs only; it does not review pull requests yet.

## Usage

```yaml
name: Conventions review
on:
  pull_request:
    types: [opened, synchronize]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: e022kklund/pr-conventions-reviewer@main
        with:
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `anthropic-api-key` | yes | | Anthropic API key. |
| `github-token` | no | `${{ github.token }}` | Token used to read the PR and post the review. |
| `rules-path` | no | `CLAUDE.md` | Path to the rules file. |
| `model` | no | `claude-sonnet-5-5` | Claude model to use. |
| `fail-on-findings` | no | `false` | Fail the check when findings are reported. |

Internal errors (for example an API failure) never fail your CI. They are logged as a warning.

## Development

Requires Node 24 or later.

```
npm install
npm run lint    # ESLint + type check
npm test        # Vitest
npm run build   # bundle to dist/ with ncc
```

`dist/` is committed because GitHub runs it directly. Rebuild it whenever `src/` changes.
