# CLAUDE.md

## What this project is

**pr-conventions-reviewer** is a GitHub Action that reviews pull requests against a repository's own written rules (for example `CLAUDE.md`, `CONTRIBUTING.md` or a dedicated `.github/review-rules.md`) and posts the findings as a review with inline comments on the PR.

### The problem it solves
Human reviewers spend a large share of their time pointing out the same convention violations over and over: wrong layer for I/O, missing tests, naming, forbidden dependencies. These rules are usually already written down, but nobody checks every PR against them. This action does that first pass automatically, so human reviewers can focus on design and correctness.

### Who it is for
Any team or open source maintainer on GitHub who has written conventions and wants them enforced consistently. Users install it with a few lines of workflow YAML and their own Anthropic API key.

## Scope of version 1
- Runs on `pull_request` events (opened, synchronize).
- Reads one rules file. Path is configurable, default `CLAUDE.md`.
- Fetches the PR diff, skips binary, generated and lock files.
- Sends rules + diff to Claude and gets back structured findings.
- Posts **one** review per run with inline comments on the relevant diff lines, plus a short summary.
- Respects a configurable maximum diff size. Above it, posts a summary comment saying the PR was too large to review.
- Never fails the user's CI because of its own errors (model or API failure → log a warning, exit successfully). Failing on findings is opt-in via an input.

### Explicitly out of scope for v1
- Writing or suggesting code fixes (`suggestion` blocks).
- Reviewing general code quality or bugs not covered by the rules file.
- Multiple rules files or rule inheritance.
- Support for GitLab, Bitbucket or other platforms.
- A hosted service or web UI. It is an Action only.

## Tech stack and why
| Choice | Why |
|---|---|
| **TypeScript (strict mode)** | GitHub's native language for JavaScript Actions; types catch mistakes when mapping model output to diff lines. |
| **Node.js (the version the Actions runtime supports)** | Required by JavaScript Actions. No Docker, so the action starts fast. |
| **`@actions/core`, `@actions/github`** | Official toolkit for inputs, outputs, logging and an authenticated Octokit client. |
| **`@anthropic-ai/sdk`** | Official client for the Claude API. |
| **Vitest** | Fast, TypeScript-friendly test runner. |
| **`@vercel/ncc`** | Bundles the action and its dependencies into a single `dist/index.js`, which is what GitHub runs. |

## Architecture principles
The code is split into layers. **All I/O lives at the edges; the core is pure.**

```
src/
  main.ts        Entry point. Reads inputs, wires layers together, handles top-level errors. No logic.
  config/        Parses and validates action inputs into a typed Config object.
  github/        All GitHub API calls (fetch diff, fetch rules file, post review). Nothing else talks to GitHub.
  llm/           All Claude API calls. Nothing else talks to the model.
  review/        Pure logic: filter files, build the prompt, parse and validate model output,
                 map findings to diff positions, format comments. No I/O, no SDK imports.
```

- **The `review/` layer must stay pure.** No network, no file system, no `process.env`, no imports from `@actions/*` or `@anthropic-ai/sdk`. It takes data in and returns data out, which makes it fully unit-testable.
- **No global state.** Pass dependencies (config, clients) as arguments. No module-level mutable variables.
- **One function, one job.** If a function needs "and" in its description, split it.
- **Never trust model output.** Validate the response against an explicit schema before using it. Drop findings that point to files or lines not in the diff.
- **Typed errors at boundaries.** `github/` and `llm/` translate library errors into the project's own error types; `main.ts` decides how to report them.
- **No `any`.** Use `unknown` and narrow it.
- **Secrets never reach logs.** The API key and GitHub token must never be logged, included in prompts or posted in comments.

## Commands
```
npm install
npm run lint       # ESLint + type check
npm test           # Vitest
npm run build      # bundle to dist/ with ncc
```
`dist/` is committed, because GitHub runs it directly. Rebuild and commit `dist/` whenever `src/` changes.

## Definition of done for a change
- `npm run lint` and `npm test` pass.
- New logic in `review/` has unit tests.
- `dist/` is rebuilt.
- `README.md` is updated if inputs, outputs or behaviour changed.

## Things the agent must NOT do
- **Do not add dependencies** (runtime or dev) without asking first and explaining why the standard library or an existing dependency is not enough.
- **Do not put I/O in `review/`**, and do not call GitHub or Claude from anywhere except `github/` and `llm/`.
- **Do not expand scope** beyond the "Scope of version 1" list. If something seems useful, propose it as an issue instead of implementing it.
- **Do not hardcode secrets, tokens, API keys or model names.** Model name and limits come from inputs with defaults in `config/`.
- **Do not make the action fail the user's CI** on internal errors.
- **Do not edit `dist/` by hand.** Only `npm run build` writes to it.
- **Do not disable or skip tests, lint rules or type checks** to make something pass. Fix the cause or ask.
- **Do not rewrite unrelated code** in the same change. Keep diffs focused on the task.
- **Do not push, create releases or publish to the Marketplace.** The human does that.
