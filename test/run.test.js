import assert from "node:assert/strict";
import test from "node:test";
import { run, validateSetupResponse } from "../src/run.js";

function fakeCore(inputs) {
  const outputs = new Map();
  const secrets = [];
  const summary = {
    text: "",
    addHeading(value) {
      this.text += `# ${value}\n`;
      return this;
    },
    addRaw(value) {
      this.text += value;
      return this;
    },
    async write() {},
  };
  return {
    outputs,
    secrets,
    summary,
    getInput(name) {
      return inputs[name] ?? "";
    },
    async getIDToken(audience) {
      assert.equal(audience, "https://api.tenpace.com");
      return "github.oidc.token";
    },
    setSecret(value) {
      secrets.push(value);
    },
    setOutput(name, value) {
      outputs.set(name, value);
    },
    notice() {},
  };
}

test("creates an OIDC-bound setup and emits only safe outputs", async () => {
  const core = fakeCore({
    "slack-channel": "pull-requests",
    preset: "repo-watch",
    "reviewer-mentions": "all",
    config: "",
  });
  let request;
  const { intent } = await run({
    actionCore: core,
    environment: {
      GITHUB_REPOSITORY: "Patrax/example",
      GITHUB_REPOSITORY_ID: "123",
      GITHUB_RUN_ID: "456",
    },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(
        JSON.stringify({
          id: "rrs_example",
          setupUrl: "https://review-router.tenpace.com/setup/rrs_example",
          agentToken: "rr_setup_secret",
          status: "awaiting_human",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    },
  });

  assert.equal(request.url, "https://api.tenpace.com/v1/review-router/setup-sessions");
  assert.equal(request.options.headers.Authorization, "Bearer github.oidc.token");
  assert.match(request.options.headers["Idempotency-Key"], /^review-router-setup:[a-f0-9]{64}$/);
  assert.ok(request.options.headers["Idempotency-Key"].length <= 200);
  assert.deepEqual(JSON.parse(request.options.body).intent, intent);
  assert.equal(intent.repository, "Patrax/example");
  assert.equal(core.outputs.get("setup-id"), "rrs_example");
  assert.equal(core.outputs.has("agent-token"), false);
  assert.deepEqual(core.secrets, ["github.oidc.token", "rr_setup_secret"]);
  assert.match(core.summary.text, /Continue Review Router setup/);
  assert.match(core.summary.text, /same GitHub account/);
  assert.doesNotMatch(core.outputs.get("setup-url"), /#claim=/);
  assert.doesNotMatch(core.summary.text, /rr_setup_secret/);
});

test("rejects secret-bearing or off-origin human handoff URLs", () => {
  const payload = {
    id: "rrs_example",
    agentToken: "rr_setup_secret",
    setupUrl: "https://review-router.tenpace.com/setup/rrs_example#claim=secret",
  };
  assert.throws(() => validateSetupResponse(payload), /invalid human setup URL/);
  assert.throws(
    () =>
      validateSetupResponse({
        ...payload,
        setupUrl: "https://attacker.example/setup/rrs_example",
      }),
    /invalid human setup URL/
  );
});
