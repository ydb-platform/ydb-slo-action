import {
  __toESM,
  require_artifact,
  require_core,
  require_exec,
  require_github
} from "./main-mj2ce5f3.js";

// init/lib/docker.ts
var import_core = __toESM(require_core(), 1), import_exec = __toESM(require_exec(), 1);
async function copyFromContainer(options) {
  let source = `${options.container}:${options.sourcePath}`;
  try {
    if (options.destinationPath)
      return await import_exec.exec("docker", ["cp", source, options.destinationPath], {
        silent: !0
      }), null;
    let chunks = [];
    return await import_exec.exec("docker", ["cp", source, "-"], {
      silent: !0,
      listeners: {
        stdout: (data) => chunks.push(data.toString())
      }
    }), chunks.join("");
  } catch (error) {
    return import_core.warning(`Failed to copy ${options.sourcePath} from ${options.container}: ${String(error)}`), null;
  }
}
async function getContainerIp(containerName) {
  try {
    let chunks = [];
    return await import_exec.exec("docker", ["inspect", "-f", "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}", containerName], {
      silent: !0,
      listeners: {
        stdout: (data) => chunks.push(data.toString())
      }
    }), chunks.join("").trim() || null;
  } catch (error) {
    return import_core.warning(`Failed to get container IP for ${containerName}: ${String(error)}`), null;
  }
}
async function collectComposeLogs(cwd) {
  try {
    let chunks = [];
    return await import_exec.exec("docker", ["compose", "-f", "compose.yml", "logs", "--no-color"], {
      cwd,
      silent: !0,
      listeners: {
        stdout: (data) => chunks.push(data.toString()),
        stderr: (data) => chunks.push(data.toString())
      }
    }), chunks.join("");
  } catch (error) {
    return import_core.warning(`Failed to collect docker compose logs: ${String(error)}`), "";
  }
}
async function getComposeProfiles(cwd) {
  try {
    let chunks = [];
    await import_exec.exec("yq", ["-r", ".. | .profiles? | select(. != null) | .[]", "compose.yml"], {
      cwd,
      silent: !0,
      ignoreReturnCode: !0,
      listeners: {
        stdout: (data) => chunks.push(data.toString())
      }
    });
    let allProfiles = chunks.join("").trim().split(`
`).filter(Boolean);
    return [...new Set(allProfiles)];
  } catch (error) {
    return import_core.warning(`Failed to detect profiles dynamically: ${String(error)}`), [];
  }
}
async function waitForContainerCompletion(options) {
  let { container, timeoutMs = 120000 } = options;
  try {
    let chunks = [], timeoutHandle = null, completed = !1, timeoutPromise = new Promise((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(Error(`Timeout waiting for container ${container} to complete`));
      }, timeoutMs);
    }), waitPromise = import_exec.exec("docker", ["wait", container], {
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
    throw Error(`Failed to wait for container ${container}: ${String(error)}`);
  }
}

// init/lib/github.ts
var import_artifact = __toESM(require_artifact(), 1), import_core2 = __toESM(require_core(), 1), import_github = __toESM(require_github(), 1);
import * as fs from "node:fs";
async function getPullRequestNumber() {
  let explicitPrNumber = import_core2.getInput("github_issue") || import_core2.getInput("github_pull_request_number");
  if (explicitPrNumber)
    return Number.parseInt(explicitPrNumber, 10);
  if (import_github.context.payload.pull_request)
    return import_github.context.payload.pull_request.number;
  let token = import_core2.getInput("github_token");
  if (!token)
    return null;
  try {
    let { data } = await import_github.getOctokit(token).rest.repos.listPullRequestsAssociatedWithCommit({
      owner: import_github.context.repo.owner,
      repo: import_github.context.repo.repo,
      commit_sha: import_github.context.sha
    });
    if (data.length > 0)
      return data[0].number;
  } catch {
    return null;
  }
  return null;
}
async function uploadArtifacts(name, artifacts, cwd) {
  let artifactClient = new import_artifact.DefaultArtifactClient, rootDirectory = cwd || process.cwd(), files = [];
  for (let artifact of artifacts) {
    if (!fs.existsSync(artifact)) {
      import_core2.warning(`Artifact source missing: ${artifact}`);
      continue;
    }
    files.push(artifact);
  }
  if (files.length === 0) {
    import_core2.warning("No artifacts to upload");
    return;
  }
  try {
    let { id } = await artifactClient.uploadArtifact(name, files, rootDirectory, {
      retentionDays: 1
    });
    import_core2.info(`Uploaded ${files.length} file(s) as artifact ${name} (id: ${id})`);
  } catch (error) {
    import_core2.warning(`Failed to upload artifacts: ${String(error)}`);
  }
}

export { copyFromContainer, getContainerIp, collectComposeLogs, getComposeProfiles, waitForContainerCompletion, getPullRequestNumber, uploadArtifacts };
