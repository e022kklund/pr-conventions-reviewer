# PR Conventions Reviewer

A GitHub Action that reviews pull requests against your repository's own written rules (for example `CLAUDE.md`) and posts the findings as one review with inline comments.

Your conventions are usually already written down, but nobody checks every pull request against them. This action does that first pass, so human reviewers can focus on design and correctness.

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
      - uses: e022kklund/pr-conventions-reviewer@v0
        with:
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

Add your Anthropic API key as the repository secret `ANTHROPIC_API_KEY`.

## How it works

1. Reads the rules file from the **base** branch of the pull request. A pull request cannot change the rules it is reviewed against.
2. Lists the changed files and skips removed, binary, lock and generated files (for example `dist/`, `*.min.js`, `package-lock.json`).
3. If the diff is larger than `max-diff-chars`, posts a comment saying so instead of a review.
4. Sends the rules and the diff to Claude, which reports findings in a fixed JSON format.
5. Validates every finding and drops the ones that point at a file or line that is not in the diff.
6. Posts one review: a summary plus one inline comment per finding.

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `anthropic-api-key` | yes | | Anthropic API key. |
| `github-token` | no | `${{ github.token }}` | Token used to read the pull request and post the review. |
| `rules-path` | no | `CLAUDE.md` | Path to the rules file. |
| `model` | no | `claude-sonnet-5-5` | Claude model to use. |
| `fail-on-findings` | no | `false` | Fail the check when findings are reported. |
| `max-diff-chars` | no | `100000` | Largest diff, in characters, that is reviewed. |

## Outputs

| Output | Description |
|---|---|
| `findings-count` | Number of findings posted in the review. |

## Behaviour you can rely on

- **Your CI never fails because of the action itself.** API errors, a missing rules file or invalid inputs are logged as a warning, and the step succeeds. Only findings can fail the check, and only with `fail-on-findings: true`.
- **Pull requests from forks are skipped.** GitHub does not pass secrets to workflows for forks, so the action logs a warning and exits.
- **Secrets stay out of logs, prompts and comments.** The API key and token are masked as soon as they are read.
- **The diff is treated as untrusted.** The model is told to ignore instructions inside the diff, and its answer is validated before anything is posted.

### Not in version 1
Code suggestions, general code-quality review, several rules files, and platforms other than GitHub.

## Development

Requires Node 24 or later.

```
npm install
npm run lint    # ESLint + type check
npm test        # Vitest
npm run build   # bundle to dist/ with ncc
```

`dist/` is committed because GitHub runs it directly. Rebuild it whenever `src/` changes; CI fails if it is out of date.

Pushes to `main` run lint, test and build, and create a release named after the version in `package.json` (for example `v0.1.0`) if it does not exist yet. The major tag (`v0`) is moved to the new release.
