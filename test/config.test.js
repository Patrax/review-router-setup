import assert from "node:assert/strict";
import test from "node:test";
import { resolveSetupConfig } from "../src/config.js";

test("resolves config as code and normalizes API enum values", async () => {
  const config = await resolveSetupConfig(
    {
      slackChannel: "",
      slackWorkspace: "",
      preset: "",
      reviewerMentions: "",
      config: ".tenpace/review-router.yml",
    },
    {
      readFile: async () => `version: 1
route:
  slack-channel: "#pull-requests"
  slack-workspace: Engineering
  preset: full-coverage
  reviewer-mentions: connected-only
`,
    }
  );
  assert.deepEqual(config, {
    slackChannel: "pull-requests",
    slackWorkspace: "Engineering",
    preset: "full_coverage",
    reviewerMentions: "connected_only",
  });
});

test("Action inputs override config and missing files are optional", async () => {
  const config = await resolveSetupConfig(
    {
      slackChannel: "reviews",
      slackWorkspace: "",
      preset: "repo-watch",
      reviewerMentions: "none",
      config: ".tenpace/review-router.yml",
    },
    {
      readFile: async () => {
        throw Object.assign(new Error("missing"), { code: "ENOENT" });
      },
    }
  ).catch((error) => {
    throw error;
  });
  assert.deepEqual(config, {
    slackChannel: "reviews",
    preset: "repo_watch",
    reviewerMentions: "none",
  });
});
