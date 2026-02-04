import {
  DefaultArtifactClient,
  context,
  exec,
  getInput,
  getOctokit,
  info,
  warning
} from "./main-st7zz2z8.js";

// init/lib/docker.ts
async function getContainerIp(containerName) {
  try {
    let chunks = [];
    return await exec("docker", ["inspect", "-f", "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}", containerName], {
      silent: !0,
      listeners: {
        stdout: (data) => chunks.push(data.toString())
      }
    }), chunks.join("").trim() || null;
  } catch (error) {
    return warning(`Failed to get container IP for ${containerName}: ${String(error)}`), null;
  }
}
async function collectComposeLogs(cwd, profiles) {
  try {
    let chunks = [];
    return await exec("docker", [
      "compose",
      ...profiles.flatMap((profile) => ["--profile", profile]),
      "-f",
      "compose.yml",
      "logs",
      "--no-color"
    ], {
      cwd,
      silent: !0,
      listeners: {
        stdout: (data) => chunks.push(data.toString()),
        stderr: (data) => chunks.push(data.toString())
      }
    }), chunks.join("");
  } catch (error) {
    return warning(`Failed to collect docker compose logs: ${String(error)}`), "";
  }
}
async function getComposeProfiles(cwd, disableProfiles = []) {
  try {
    let chunks = [];
    await exec("yq", ["-r", ".. | .profiles? | select(. != null) | .[]", "compose.yml"], {
      cwd,
      silent: !0,
      ignoreReturnCode: !0,
      listeners: {
        stdout: (data) => chunks.push(data.toString())
      }
    });
    let profiles = chunks.join("").trim().split(`
`).filter(Boolean).filter((profile) => !disableProfiles.includes(profile));
    return [...new Set(profiles)];
  } catch (error) {
    return warning(`Failed to detect profiles dynamically: ${String(error)}`), [];
  }
}
async function waitForContainerCompletion(options) {
  let { container, timeoutMs = 120000 } = options;
  try {
    let chunks = [], timeoutHandle = null, completed = !1, timeoutPromise = new Promise((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(Error(`Timeout waiting for container ${container} to complete`));
      }, timeoutMs);
    }), waitPromise = exec("docker", ["wait", container], {
      silent: !0,
      listeners: {
        stdout: (data) => chunks.push(data.toString())
      }
    }).then(() => {
      if (completed = !0, timeoutHandle)
        clearTimeout(timeoutHandle);
    });
    if (await Promise.race([waitPromise, timeoutPromise]), !completed)
      throw Error(`Container ${container} did not complete in time`);
    let exitCode = parseInt(chunks.join("").trim(), 10);
    if (exitCode !== 0)
      throw Error(`Container ${container} exited with code ${exitCode}`);
  } catch (error) {
    let statusInfo = "";
    try {
      let statusChunks = [];
      await exec("docker", ["inspect", "-f", "{{.State.Status}} ({{.State.ExitCode}})", container], {
        silent: !0,
        listeners: {
          stdout: (data) => statusChunks.push(data.toString())
        }
      }), statusInfo = ` [Status: ${statusChunks.join("").trim()}]`;
    } catch {}
    throw Error(`Failed to wait for container ${container}${statusInfo}: ${String(error)}`);
  }
}

// init/lib/github.ts
import * as fs from "node:fs";
async function getPullRequestNumber() {
  let explicitPrNumber = getInput("github_issue") || getInput("github_pull_request_number");
  if (explicitPrNumber)
    return Number.parseInt(explicitPrNumber, 10);
  if (context.payload.pull_request)
    return context.payload.pull_request.number;
  let token = getInput("github_token");
  if (!token)
    return null;
  try {
    let { data } = await getOctokit(token).rest.repos.listPullRequestsAssociatedWithCommit({
      owner: context.repo.owner,
      repo: context.repo.repo,
      commit_sha: context.sha
    });
    if (data.length > 0)
      return data[0].number;
  } catch {
    return null;
  }
  return null;
}
async function uploadArtifacts(name, artifacts, cwd) {
  let artifactClient = new DefaultArtifactClient, rootDirectory = cwd || process.cwd(), files = [];
  for (let artifact of artifacts) {
    if (!fs.existsSync(artifact)) {
      warning(`Artifact source missing: ${artifact}`);
      continue;
    }
    files.push(artifact);
  }
  if (files.length === 0) {
    warning("No artifacts to upload");
    return;
  }
  try {
    let { id } = await artifactClient.uploadArtifact(name, files, rootDirectory, {
      retentionDays: 1
    });
    info(`Uploaded ${files.length} file(s) as artifact ${name} (id: ${id})`);
  } catch (error) {
    warning(`Failed to upload artifacts: ${String(error)}`);
  }
}

export { getContainerIp, collectComposeLogs, getComposeProfiles, waitForContainerCompletion, getPullRequestNumber, uploadArtifacts };
