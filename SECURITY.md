# Security

Report vulnerabilities privately through GitHub Security Advisories for this repository.

The Action requests a short-lived GitHub Actions OIDC token for `https://api.tenpace.com`. The API origin is fixed: the Action sends the token only to the Tenpace setup endpoint and masks it immediately. The API verifies the issuer, signature, audience, time window, repository ID, owner ID, actor ID, subject, and repository binding.

The URL written to the GitHub job summary contains no claim secret. Tenpace binds it to the OIDC actor, so the same GitHub user who started the workflow must open it and be a Tenpace team admin.

The Action never receives GitHub App installation credentials, Slack OAuth tokens, Tenpace sessions, or provider authorization codes. A human team admin completes those steps in the browser. Claiming locks the exact intent and prevents later machine edits; authenticated admin edits create and lock a new version atomically.

Do not include secrets in issues or pull requests.
