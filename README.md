# Review Router Setup

[![Test](https://github.com/Patrax/review-router-setup/actions/workflows/test.yml/badge.svg)](https://github.com/Patrax/review-router-setup/actions/workflows/test.yml)

Create a GitHub-to-Slack Review Router connection from a workflow or AI coding session. The Action produces one short-lived browser link. A Tenpace team admin reviews the exact repository, Slack destination, routing preset, and reviewer mention policy before anything changes.

The Action never receives GitHub App credentials, Slack OAuth tokens, provider authorization codes, or the human's Tenpace session.

## Use the Action

Create `.github/workflows/review-router-setup.yml`:

```yaml
name: Set up Review Router

on:
  workflow_dispatch:

permissions:
  contents: read
  id-token: write

jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: Patrax/review-router-setup@v1
        with:
          slack-channel: pull-requests
          preset: repo-watch
          reviewer-mentions: all
```

Run the workflow. The same GitHub user who started it opens the **Authorize Review Router setup** link in the job summary as a Tenpace team admin, completes the GitHub and Slack steps, and lets the page reconcile and verify the route with a real Slack delivery.

## Config as code

Instead of inputs, commit `.tenpace/review-router.yml`:

```yaml
version: 1
route:
  slack-channel: pull-requests
  preset: repo-watch
  reviewer-mentions: all
```

You can also set `slack-workspace` when the Tenpace team has more than one connected workspace. Explicit Action inputs override the file.

## Inputs

- `slack-channel`: Slack channel name, with or without `#`. Required unless present in the config file.
- `slack-workspace`: Optional exact workspace name, Slack team ID, or Tenpace workspace ID.
- `preset`: `repo-watch`, `full-coverage`, or `team-activity`. Default: `repo-watch`.
- `reviewer-mentions`: `all`, `connected-only`, or `none`. Default: `all`.
- `config`: Config path. Default: `.tenpace/review-router.yml`.

## Outputs

- `setup-id`: Public setup-session ID.
- `setup-url`: Short-lived human authorization URL.
- `status`: Initial status, normally `awaiting_human`.

The machine setup token is masked and deliberately not exposed as an Action output. The displayed URL contains no claim secret: it is bound to the GitHub actor in the signed OIDC token, and that same GitHub user must open it. The browser flow can finish the approved setup without putting a secret into another workflow step.

## Security model

GitHub Actions OIDC proves the repository and actor for the workflow run. It does not grant provider authority. Tenpace verifies the OIDC issuer, signature, audience, time window, repository and owner IDs, actor ID, subject, and repository binding. Action URLs contain no claim secret and can only be claimed by that GitHub actor.

The server creates an inert intent. A signed-in Tenpace team or organization admin claims the setup URL and approves one exact intent version. Any edit invalidates approval. Provider OAuth stays in the browser and encrypted credentials stay on Tenpace.

Setup creation and application are idempotent. The final check sends one message through the same Slack delivery path used for pull request notifications.

See [SECURITY.md](SECURITY.md) for reporting and operational details.

## For coding agents

Read [AGENTS.md](AGENTS.md) before automating setup. Canonical machine-readable surfaces:

- [OpenAPI 3.1](https://api.tenpace.com/openapi.json)
- [Remote MCP](https://api.tenpace.com/mcp)
- [MCP Registry metadata](server.json)
- [Agent descriptor](https://api.tenpace.com/.well-known/tenpace-agent.json)
- [Raw Markdown guide](https://review-router.tenpace.com/docs/agent-setup.md)
- [llms.txt](https://review-router.tenpace.com/llms.txt)

No AI-discovery convention is universal, so the same workflow is described in the Action metadata, README, AGENTS.md, linked HTML/Markdown docs, OpenAPI, MCP, and well-known descriptor.

The remote MCP server is also published to the official MCP Registry as

`io.github.patrax/review-router`

## License

MIT
