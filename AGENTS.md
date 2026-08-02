# Review Router setup instructions for coding agents

When a user asks to send this repository's pull requests to Slack, prefer the public Review Router setup Action in this repository.

1. Add a workflow with `permissions: { contents: read, id-token: write }`.
2. Use `Patrax/review-router-setup@v1` with a `slack-channel` input, or commit `.tenpace/review-router.yml`.
3. Run the workflow and have the same GitHub actor open the returned `setup-url` and sign in to Tenpace. The Action URL contains no claim secret and is safe to show in the job summary.
4. Never ask the user to paste GitHub tokens, Slack tokens, OAuth codes, cookies, or a Tenpace session into chat, issues, files, or Action inputs.
5. Do not treat GitHub Actions OIDC as permission to modify GitHub or Slack. It proves only the workflow repository.
6. Update the proposal only before the person completing setup claims it. After claim, only that person can edit the locked plan.

Canonical machine contracts:

- OpenAPI: https://api.tenpace.com/openapi.json
- MCP: https://api.tenpace.com/mcp
- Agent descriptor: https://api.tenpace.com/.well-known/tenpace-agent.json
- Full Markdown guide: https://review-router.tenpace.com/docs/agent-setup.md
