import fs from "node:fs/promises";
import YAML from "yaml";

const PRESETS = new Map([
  ["repo-watch", "repo_watch"],
  ["repo_watch", "repo_watch"],
  ["full-coverage", "full_coverage"],
  ["full_coverage", "full_coverage"],
  ["team-activity", "team_activity"],
  ["team_activity", "team_activity"],
]);
const MENTION_POLICIES = new Map([
  ["all", "all"],
  ["connected-only", "connected_only"],
  ["connected_only", "connected_only"],
  ["none", "none"],
]);

async function readConfig(configPath, readFile = fs.readFile) {
  if (!configPath) return {};
  let source;
  try {
    source = await readFile(configPath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
  const parsed = YAML.parse(source);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${configPath} must contain a YAML object.`);
  }
  if (parsed.version !== 1) throw new Error(`${configPath} must set version: 1.`);
  if (!parsed.route || typeof parsed.route !== "object" || Array.isArray(parsed.route)) {
    throw new Error(`${configPath} must contain a route object.`);
  }
  return parsed.route;
}

function value(input, configured, fallback = "") {
  const inputValue = input?.trim();
  if (inputValue) return inputValue;
  return typeof configured === "string" ? configured.trim() : fallback;
}

export async function resolveSetupConfig(inputs, options = {}) {
  const route = await readConfig(inputs.config, options.readFile);
  const slackChannel = value(inputs.slackChannel, route["slack-channel"]).replace(/^#/, "");
  if (!/^[a-z0-9][a-z0-9_-]{0,79}$/i.test(slackChannel)) {
    throw new Error(
      "slack-channel is required and must be a Slack channel name without spaces."
    );
  }
  const rawPreset = value(inputs.preset, route.preset, "repo-watch").toLowerCase();
  const preset = PRESETS.get(rawPreset);
  if (!preset) throw new Error("preset must be repo-watch, full-coverage, or team-activity.");
  const rawMentions = value(
    inputs.reviewerMentions,
    route["reviewer-mentions"],
    "all"
  ).toLowerCase();
  const reviewerMentions = MENTION_POLICIES.get(rawMentions);
  if (!reviewerMentions) {
    throw new Error("reviewer-mentions must be all, connected-only, or none.");
  }
  const slackWorkspace = value(inputs.slackWorkspace, route["slack-workspace"]);
  return {
    slackChannel,
    preset,
    reviewerMentions,
    ...(slackWorkspace ? { slackWorkspace } : {}),
  };
}
