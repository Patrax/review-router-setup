import * as core from "@actions/core";
import { createHash } from "node:crypto";
import { resolveSetupConfig } from "./config.js";

const API_ORIGIN = "https://api.tenpace.com";

function inputsFromCore(actionCore) {
  return {
    slackChannel: actionCore.getInput("slack-channel"),
    slackWorkspace: actionCore.getInput("slack-workspace"),
    preset: actionCore.getInput("preset"),
    reviewerMentions: actionCore.getInput("reviewer-mentions"),
    config: actionCore.getInput("config"),
  };
}

function repositoryFromEnvironment(environment) {
  const repository = environment.GITHUB_REPOSITORY?.trim();
  if (!repository || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new Error("GITHUB_REPOSITORY is missing or invalid. Run this Action inside GitHub Actions.");
  }
  return repository;
}

function stableRunKey(environment, intent) {
  const runId = environment.GITHUB_RUN_ID || "unknown-run";
  const digest = createHash("sha256")
    .update(
      JSON.stringify({
        repository: environment.GITHUB_REPOSITORY_ID || environment.GITHUB_REPOSITORY,
        runId,
        intent,
      })
    )
    .digest("hex");
  return `review-router-setup:${digest}`;
}

export function validateSetupResponse(payload) {
  if (
    typeof payload?.id !== "string" ||
    !/^rrs_[A-Za-z0-9_-]{6,40}$/.test(payload.id) ||
    typeof payload?.agentToken !== "string" ||
    !/^rr_setup_[A-Za-z0-9_-]{6,100}$/.test(payload.agentToken)
  ) {
    throw new Error("Tenpace setup API returned an incomplete setup response.");
  }
  let setupUrl;
  try {
    setupUrl = new URL(payload.setupUrl);
  } catch {
    throw new Error("Tenpace setup API returned an invalid human setup URL.");
  }
  if (
    setupUrl.origin !== "https://review-router.tenpace.com" ||
    setupUrl.pathname !== `/setup/${payload.id}` ||
    setupUrl.search ||
    setupUrl.hash
  ) {
    throw new Error("Tenpace setup API returned an invalid human setup URL.");
  }
  return setupUrl.toString();
}

export async function run({
  actionCore = core,
  environment = process.env,
  fetchImpl = fetch,
  readFile,
} = {}) {
  const inputs = inputsFromCore(actionCore);
  const repository = repositoryFromEnvironment(environment);
  const route = await resolveSetupConfig(inputs, { readFile });
  const intent = { repository, ...route };

  let oidcToken;
  try {
    oidcToken = await actionCore.getIDToken(API_ORIGIN);
  } catch {
    throw new Error(
      "GitHub OIDC is unavailable. Add `permissions: { contents: read, id-token: write }` to the workflow job."
    );
  }
  actionCore.setSecret(oidcToken);
  const response = await fetchImpl(`${API_ORIGIN}/v1/review-router/setup-sessions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${oidcToken}`,
      "Content-Type": "application/json",
      "Idempotency-Key": stableRunKey(environment, intent),
      "User-Agent": "review-router-setup-action/1.0.0",
    },
    body: JSON.stringify({ source: "github_action", intent }),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload.message || payload.error || `Tenpace setup API returned HTTP ${response.status}.`
    );
  }
  const setupUrl = validateSetupResponse(payload);

  actionCore.setSecret(payload.agentToken);
  actionCore.setOutput("setup-id", payload.id);
  actionCore.setOutput("setup-url", setupUrl);
  actionCore.setOutput("status", payload.status);
  await actionCore.summary
    .addHeading("Review Router setup")
    .addRaw(
      `An agent proposed this exact connection:\n\n- Repository: \`${intent.repository}\`\n- Slack channel: \`#${intent.slackChannel}\`\n- Preset: \`${intent.preset}\`\n- Reviewer mentions: \`${intent.reviewerMentions}\`\n\n[Authorize Review Router setup](${setupUrl})\n\nOpen the link with the same GitHub account that started this workflow. A Tenpace team admin must approve this exact intent and complete GitHub and Slack authorization. The Action does not receive provider credentials.\n`
    )
    .write();
  actionCore.notice("Review Router setup is waiting for a human team admin.", {
    title: "Authorization required",
  });
  return { payload, intent };
}
