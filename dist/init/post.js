import {
  collectMetrics,
  parseMetricsYaml
} from "./lib/metrics.js";
import {
  require_artifact
} from "../main-1jw8rte1.js";
import {
  require_core
} from "../main-d15da32k.js";
import"../main-2h1wxd0e.js";
import"../main-zqznhazw.js";
import {
  require_exec
} from "../main-c7r720rd.js";
import {
  __toESM
} from "../main-ynsbc1hx.js";

// init/post.ts
var import_core3 = __toESM(require_core(), 1);
import * as fs2 from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// init/lib/artifacts.ts
var import_artifact = __toESM(require_artifact(), 1), import_core = __toESM(require_core(), 1);
import * as fs from "node:fs";
async function uploadArtifacts(name, artifacts, cwd) {
  let artifactClient = new import_artifact.DefaultArtifactClient, rootDirectory = cwd || process.cwd(), files = [];
  for (let artifact of artifacts) {
    if (!fs.existsSync(artifact.path)) {
      import_core.warning(`Artifact source missing: ${artifact.path}`);
      continue;
    }
    files.push(artifact.path);
  }
  if (files.length === 0) {
    import_core.warning("No artifacts to upload");
    return;
  }
  try {
    let { id } = await artifactClient.uploadArtifact(name, files, rootDirectory, {
      retentionDays: 1
    });
    import_core.info(`Uploaded ${files.length} file(s) as artifact ${name} (id: ${id})`);
  } catch (error) {
    import_core.warning(`Failed to upload artifacts: ${String(error)}`);
  }
}

// init/lib/docker.ts
var import_core2 = __toESM(require_core(), 1), import_exec = __toESM(require_exec(), 1);
async function getContainerIp(containerName, cwd) {
  try {
    let chunks = [];
    return await import_exec.exec("docker", ["inspect", "-f", "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}", containerName], {
      cwd,
      silent: !0,
      listeners: {
        stdout: (data) => chunks.push(data.toString())
      }
    }), chunks.join("").trim() || null;
  } catch (error) {
    return import_core2.warning(`Failed to get container IP for ${containerName}: ${String(error)}`), null;
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
    return import_core2.warning(`Failed to collect docker compose logs: ${String(error)}`), "";
  }
}
async function collectDockerEvents(options) {
  let events = [];
  try {
    let chunks = [];
    await import_exec.exec("docker", [
      "events",
      "--filter",
      "label=ydb.node.type=database",
      "--filter",
      "event=stop",
      "--filter",
      "event=start",
      "--filter",
      "event=kill",
      "--filter",
      "event=restart",
      "--since",
      options.since.toISOString(),
      "--until",
      options.until.toISOString(),
      "--format",
      "{{json .}}"
    ], {
      cwd: options.cwd,
      silent: !0,
      listeners: {
        stdout: (data) => chunks.push(data.toString())
      }
    });
    let lines = chunks.join("").split(`
`).filter(Boolean);
    for (let line of lines)
      events.push(JSON.parse(line));
  } catch (error) {
    import_core2.warning(`Failed to collect Docker events: ${String(error)}`);
  }
  return events;
}
async function stopCompose(cwd) {
  await import_exec.exec("docker", ["compose", "-f", "compose.yml", "down"], { cwd });
}

// init/post.ts
async function post() {
  let cwd = import_core3.getState("cwd"), workload = import_core3.getState("workload"), start = new Date(import_core3.getState("start")), finish = /* @__PURE__ */ new Date, duration = finish.getTime() - start.getTime(), pullPath = import_core3.getState("pull_info_path"), logsPath = path.join(cwd, `${workload}-logs.txt`), eventsPath = path.join(cwd, `${workload}-events.jsonl`), metricsPath = path.join(cwd, `${workload}-metrics.jsonl`), prometheusIp = await getContainerIp("prometheus", cwd), prometheusUrl = prometheusIp ? `http://${prometheusIp}:9090` : "http://localhost:9090";
  import_core3.debug(`Prometheus URL: ${prometheusUrl}`);
  let actionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../"), defaultMetricsPath = path.join(actionRoot, "deploy", "metrics.yaml"), metricsYaml = fs2.readFileSync(defaultMetricsPath, { encoding: "utf-8" }), customMetricsYaml = import_core3.getInput("metrics_yaml");
  if (import_core3.getInput("metrics_yaml_path")) {
    let customMetricsPath = import_core3.getInput("metrics_yaml_path");
    if (!fs2.existsSync(customMetricsPath))
      import_core3.warning(`Custom metrics file not found: ${customMetricsPath}`);
    else
      customMetricsYaml = fs2.readFileSync(customMetricsPath, { encoding: "utf-8" });
  }
  {
    import_core3.info("Collecting logs...");
    let logs = await collectComposeLogs(cwd);
    fs2.writeFileSync(logsPath, logs, { encoding: "utf-8" });
  }
  {
    import_core3.info("Collecting events...");
    let content = (await collectDockerEvents({
      cwd,
      since: start,
      until: finish
    })).map((e) => JSON.stringify(e)).join(`
`);
    fs2.writeFileSync(eventsPath, content, { encoding: "utf-8" });
  }
  {
    import_core3.info("Collecting metrics...");
    let metricsDef = [];
    if (metricsYaml) {
      let defaultMetrics = await parseMetricsYaml(metricsYaml);
      metricsDef.push(...defaultMetrics);
    }
    if (customMetricsYaml) {
      let customMetrics = await parseMetricsYaml(customMetricsYaml);
      metricsDef.push(...customMetrics);
    }
    let content = (await collectMetrics({
      url: prometheusUrl,
      start: start.getTime() / 1000,
      end: finish.getTime() / 1000,
      metrics: metricsDef,
      timeout: 30000
    })).map((m) => JSON.stringify(m)).join(`
`);
    fs2.writeFileSync(metricsPath, content, { encoding: "utf-8" });
  }
  import_core3.info("Stopping YDB services..."), await stopCompose(cwd);
  {
    import_core3.info("Uploading artifacts...");
    let artifacts = [
      { name: `${workload}-pull.txt`, path: pullPath },
      { name: `${workload}-logs.txt`, path: logsPath },
      { name: `${workload}-events.jsonl`, path: eventsPath },
      { name: `${workload}-metrics.jsonl`, path: metricsPath }
    ];
    await uploadArtifacts(workload, artifacts, cwd);
  }
  import_core3.info(`YDB SLO Test duration: ${(duration / 1000).toFixed(1)}s`);
}
post();

//# debugId=19111D8F150AEC4E64756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vaW5pdC9wb3N0LnRzIiwgIi4uL2luaXQvbGliL2FydGlmYWN0cy50cyIsICIuLi9pbml0L2xpYi9kb2NrZXIudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbCiAgICAiaW1wb3J0ICogYXMgZnMgZnJvbSAnbm9kZTpmcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJ1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ25vZGU6dXJsJ1xuXG5pbXBvcnQgeyBkZWJ1ZywgZ2V0SW5wdXQsIGdldFN0YXRlLCBpbmZvLCB3YXJuaW5nIH0gZnJvbSAnQGFjdGlvbnMvY29yZSdcblxuaW1wb3J0IHsgdXBsb2FkQXJ0aWZhY3RzLCB0eXBlIEFydGlmYWN0RmlsZSB9IGZyb20gJy4vbGliL2FydGlmYWN0cy5qcydcbmltcG9ydCB7IGNvbGxlY3RDb21wb3NlTG9ncywgY29sbGVjdERvY2tlckV2ZW50cywgZ2V0Q29udGFpbmVySXAsIHN0b3BDb21wb3NlIH0gZnJvbSAnLi9saWIvZG9ja2VyLmpzJ1xuaW1wb3J0IHsgY29sbGVjdE1ldHJpY3MsIHBhcnNlTWV0cmljc1lhbWwsIHR5cGUgTWV0cmljRGVmaW5pdGlvbiB9IGZyb20gJy4vbGliL21ldHJpY3MuanMnXG5cbmFzeW5jIGZ1bmN0aW9uIHBvc3QoKSB7XG5cdGxldCBjd2QgPSBnZXRTdGF0ZSgnY3dkJylcblx0bGV0IHdvcmtsb2FkID0gZ2V0U3RhdGUoJ3dvcmtsb2FkJylcblxuXHRsZXQgc3RhcnQgPSBuZXcgRGF0ZShnZXRTdGF0ZSgnc3RhcnQnKSlcblx0bGV0IGZpbmlzaCA9IG5ldyBEYXRlKClcblx0bGV0IGR1cmF0aW9uID0gZmluaXNoLmdldFRpbWUoKSAtIHN0YXJ0LmdldFRpbWUoKVxuXG5cdGxldCBwdWxsUGF0aCA9IGdldFN0YXRlKCdwdWxsX2luZm9fcGF0aCcpXG5cdGxldCBsb2dzUGF0aCA9IHBhdGguam9pbihjd2QsIGAke3dvcmtsb2FkfS1sb2dzLnR4dGApXG5cdGxldCBldmVudHNQYXRoID0gcGF0aC5qb2luKGN3ZCwgYCR7d29ya2xvYWR9LWV2ZW50cy5qc29ubGApXG5cdGxldCBtZXRyaWNzUGF0aCA9IHBhdGguam9pbihjd2QsIGAke3dvcmtsb2FkfS1tZXRyaWNzLmpzb25sYClcblxuXHRsZXQgcHJvbWV0aGV1c0lwID0gYXdhaXQgZ2V0Q29udGFpbmVySXAoJ3Byb21ldGhldXMnLCBjd2QpXG5cdGxldCBwcm9tZXRoZXVzVXJsID0gcHJvbWV0aGV1c0lwID8gYGh0dHA6Ly8ke3Byb21ldGhldXNJcH06OTA5MGAgOiAnaHR0cDovL2xvY2FsaG9zdDo5MDkwJ1xuXHRkZWJ1ZyhgUHJvbWV0aGV1cyBVUkw6ICR7cHJvbWV0aGV1c1VybH1gKVxuXG5cdGxldCBhY3Rpb25Sb290ID0gcGF0aC5yZXNvbHZlKHBhdGguZGlybmFtZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCkpLCAnLi4vLi4vJylcblx0bGV0IGRlZmF1bHRNZXRyaWNzUGF0aCA9IHBhdGguam9pbihhY3Rpb25Sb290LCAnZGVwbG95JywgJ21ldHJpY3MueWFtbCcpXG5cblx0bGV0IG1ldHJpY3NZYW1sID0gZnMucmVhZEZpbGVTeW5jKGRlZmF1bHRNZXRyaWNzUGF0aCwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KVxuXHRsZXQgY3VzdG9tTWV0cmljc1lhbWwgPSBnZXRJbnB1dCgnbWV0cmljc195YW1sJylcblxuXHRpZiAoZ2V0SW5wdXQoJ21ldHJpY3NfeWFtbF9wYXRoJykpIHtcblx0XHRsZXQgY3VzdG9tTWV0cmljc1BhdGggPSBnZXRJbnB1dCgnbWV0cmljc195YW1sX3BhdGgnKVxuXHRcdGlmICghZnMuZXhpc3RzU3luYyhjdXN0b21NZXRyaWNzUGF0aCkpIHtcblx0XHRcdHdhcm5pbmcoYEN1c3RvbSBtZXRyaWNzIGZpbGUgbm90IGZvdW5kOiAke2N1c3RvbU1ldHJpY3NQYXRofWApXG5cdFx0fSBlbHNlIHtcblx0XHRcdGN1c3RvbU1ldHJpY3NZYW1sID0gZnMucmVhZEZpbGVTeW5jKGN1c3RvbU1ldHJpY3NQYXRoLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pXG5cdFx0fVxuXHR9XG5cblx0e1xuXHRcdGluZm8oJ0NvbGxlY3RpbmcgbG9ncy4uLicpXG5cdFx0bGV0IGxvZ3MgPSBhd2FpdCBjb2xsZWN0Q29tcG9zZUxvZ3MoY3dkKVxuXG5cdFx0ZnMud3JpdGVGaWxlU3luYyhsb2dzUGF0aCwgbG9ncywgeyBlbmNvZGluZzogJ3V0Zi04JyB9KVxuXHR9XG5cblx0e1xuXHRcdGluZm8oJ0NvbGxlY3RpbmcgZXZlbnRzLi4uJylcblx0XHRsZXQgZXZlbnRzID0gYXdhaXQgY29sbGVjdERvY2tlckV2ZW50cyh7XG5cdFx0XHRjd2QsXG5cdFx0XHRzaW5jZTogc3RhcnQsXG5cdFx0XHR1bnRpbDogZmluaXNoLFxuXHRcdH0pXG5cblx0XHRsZXQgY29udGVudCA9IGV2ZW50cy5tYXAoKGUpID0+IEpTT04uc3RyaW5naWZ5KGUpKS5qb2luKCdcXG4nKVxuXHRcdGZzLndyaXRlRmlsZVN5bmMoZXZlbnRzUGF0aCwgY29udGVudCwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KVxuXHR9XG5cblx0e1xuXHRcdGluZm8oJ0NvbGxlY3RpbmcgbWV0cmljcy4uLicpXG5cblx0XHRsZXQgbWV0cmljc0RlZjogTWV0cmljRGVmaW5pdGlvbltdID0gW11cblxuXHRcdGlmIChtZXRyaWNzWWFtbCkge1xuXHRcdFx0bGV0IGRlZmF1bHRNZXRyaWNzID0gYXdhaXQgcGFyc2VNZXRyaWNzWWFtbChtZXRyaWNzWWFtbClcblx0XHRcdG1ldHJpY3NEZWYucHVzaCguLi5kZWZhdWx0TWV0cmljcylcblx0XHR9XG5cblx0XHRpZiAoY3VzdG9tTWV0cmljc1lhbWwpIHtcblx0XHRcdGxldCBjdXN0b21NZXRyaWNzID0gYXdhaXQgcGFyc2VNZXRyaWNzWWFtbChjdXN0b21NZXRyaWNzWWFtbClcblx0XHRcdG1ldHJpY3NEZWYucHVzaCguLi5jdXN0b21NZXRyaWNzKVxuXHRcdH1cblxuXHRcdGxldCBtZXRyaWNzID0gYXdhaXQgY29sbGVjdE1ldHJpY3Moe1xuXHRcdFx0dXJsOiBwcm9tZXRoZXVzVXJsLFxuXHRcdFx0c3RhcnQ6IHN0YXJ0LmdldFRpbWUoKSAvIDEwMDAsXG5cdFx0XHRlbmQ6IGZpbmlzaC5nZXRUaW1lKCkgLyAxMDAwLFxuXHRcdFx0bWV0cmljczogbWV0cmljc0RlZixcblx0XHRcdHRpbWVvdXQ6IDMwMDAwLFxuXHRcdH0pXG5cblx0XHRsZXQgY29udGVudCA9IG1ldHJpY3MubWFwKChtKSA9PiBKU09OLnN0cmluZ2lmeShtKSkuam9pbignXFxuJylcblx0XHRmcy53cml0ZUZpbGVTeW5jKG1ldHJpY3NQYXRoLCBjb250ZW50LCB7IGVuY29kaW5nOiAndXRmLTgnIH0pXG5cdH1cblxuXHR7XG5cdFx0aW5mbygnU3RvcHBpbmcgWURCIHNlcnZpY2VzLi4uJylcblx0XHRhd2FpdCBzdG9wQ29tcG9zZShjd2QpXG5cdH1cblxuXHR7XG5cdFx0aW5mbygnVXBsb2FkaW5nIGFydGlmYWN0cy4uLicpXG5cblx0XHRsZXQgYXJ0aWZhY3RzOiBBcnRpZmFjdEZpbGVbXSA9IFtcblx0XHRcdHsgbmFtZTogYCR7d29ya2xvYWR9LXB1bGwudHh0YCwgcGF0aDogcHVsbFBhdGggfSxcblx0XHRcdHsgbmFtZTogYCR7d29ya2xvYWR9LWxvZ3MudHh0YCwgcGF0aDogbG9nc1BhdGggfSxcblx0XHRcdHsgbmFtZTogYCR7d29ya2xvYWR9LWV2ZW50cy5qc29ubGAsIHBhdGg6IGV2ZW50c1BhdGggfSxcblx0XHRcdHsgbmFtZTogYCR7d29ya2xvYWR9LW1ldHJpY3MuanNvbmxgLCBwYXRoOiBtZXRyaWNzUGF0aCB9LFxuXHRcdF1cblxuXHRcdGF3YWl0IHVwbG9hZEFydGlmYWN0cyh3b3JrbG9hZCwgYXJ0aWZhY3RzLCBjd2QpXG5cdH1cblxuXHRpbmZvKGBZREIgU0xPIFRlc3QgZHVyYXRpb246ICR7KGR1cmF0aW9uIC8gMTAwMCkudG9GaXhlZCgxKX1zYClcbn1cblxucG9zdCgpXG4iLAogICAgImltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMnXG5cbmltcG9ydCB7IERlZmF1bHRBcnRpZmFjdENsaWVudCB9IGZyb20gJ0BhY3Rpb25zL2FydGlmYWN0J1xuaW1wb3J0IHsgaW5mbywgd2FybmluZyB9IGZyb20gJ0BhY3Rpb25zL2NvcmUnXG5cbmV4cG9ydCBpbnRlcmZhY2UgQXJ0aWZhY3RGaWxlIHtcblx0bmFtZTogc3RyaW5nXG5cdHBhdGg6IHN0cmluZ1xufVxuXG4vKipcbiAqIFVwbG9hZHMgYXJ0aWZhY3RzIHRvIEdpdEh1YiBBY3Rpb25zIGFzIGEgc2luZ2xlIGJ1bmRsZVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBsb2FkQXJ0aWZhY3RzKG5hbWU6IHN0cmluZywgYXJ0aWZhY3RzOiBBcnRpZmFjdEZpbGVbXSwgY3dkPzogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG5cdGxldCBhcnRpZmFjdENsaWVudCA9IG5ldyBEZWZhdWx0QXJ0aWZhY3RDbGllbnQoKVxuXHRsZXQgcm9vdERpcmVjdG9yeSA9IGN3ZCB8fCBwcm9jZXNzLmN3ZCgpXG5cblx0bGV0IGZpbGVzOiBzdHJpbmdbXSA9IFtdXG5cblx0Zm9yIChsZXQgYXJ0aWZhY3Qgb2YgYXJ0aWZhY3RzKSB7XG5cdFx0aWYgKCFmcy5leGlzdHNTeW5jKGFydGlmYWN0LnBhdGgpKSB7XG5cdFx0XHR3YXJuaW5nKGBBcnRpZmFjdCBzb3VyY2UgbWlzc2luZzogJHthcnRpZmFjdC5wYXRofWApXG5cdFx0XHRjb250aW51ZVxuXHRcdH1cblx0XHRmaWxlcy5wdXNoKGFydGlmYWN0LnBhdGgpXG5cdH1cblxuXHRpZiAoZmlsZXMubGVuZ3RoID09PSAwKSB7XG5cdFx0d2FybmluZygnTm8gYXJ0aWZhY3RzIHRvIHVwbG9hZCcpXG5cdFx0cmV0dXJuXG5cdH1cblxuXHR0cnkge1xuXHRcdC8vIEtlZXAgYXJ0aWZhY3RzIGZvciAxIGRheSBvbmx5IHRvIHNhdmUgc3RvcmFnZSBzcGFjZVxuXHRcdGxldCB7IGlkIH0gPSBhd2FpdCBhcnRpZmFjdENsaWVudC51cGxvYWRBcnRpZmFjdChuYW1lLCBmaWxlcywgcm9vdERpcmVjdG9yeSwge1xuXHRcdFx0cmV0ZW50aW9uRGF5czogMSxcblx0XHR9KVxuXG5cdFx0aW5mbyhgVXBsb2FkZWQgJHtmaWxlcy5sZW5ndGh9IGZpbGUocykgYXMgYXJ0aWZhY3QgJHtuYW1lfSAoaWQ6ICR7aWR9KWApXG5cdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0d2FybmluZyhgRmFpbGVkIHRvIHVwbG9hZCBhcnRpZmFjdHM6ICR7U3RyaW5nKGVycm9yKX1gKVxuXHR9XG59XG4iLAogICAgImltcG9ydCB7IHdhcm5pbmcgfSBmcm9tICdAYWN0aW9ucy9jb3JlJ1xuaW1wb3J0IHsgZXhlYyB9IGZyb20gJ0BhY3Rpb25zL2V4ZWMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgRG9ja2VyRXZlbnQge1xuXHRzdGF0dXM6IHN0cmluZ1xuXHRpZDogc3RyaW5nXG5cdGZyb206IHN0cmluZ1xuXHRUeXBlOiBzdHJpbmdcblx0QWN0aW9uOiBzdHJpbmdcblx0QWN0b3I6IHtcblx0XHRJRDogc3RyaW5nXG5cdFx0QXR0cmlidXRlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuXHR9XG5cdHNjb3BlOiBzdHJpbmdcblx0dGltZTogbnVtYmVyXG5cdHRpbWVOYW5vOiBudW1iZXJcbn1cblxuLyoqXG4gKiBHZXRzIElQIGFkZHJlc3Mgb2YgYSBEb2NrZXIgY29udGFpbmVyXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRDb250YWluZXJJcChjb250YWluZXJOYW1lOiBzdHJpbmcsIGN3ZDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG5cdHRyeSB7XG5cdFx0bGV0IGNodW5rczogc3RyaW5nW10gPSBbXVxuXG5cdFx0YXdhaXQgZXhlYyhcblx0XHRcdCdkb2NrZXInLFxuXHRcdFx0WydpbnNwZWN0JywgJy1mJywgJ3t7cmFuZ2UgLk5ldHdvcmtTZXR0aW5ncy5OZXR3b3Jrc319e3suSVBBZGRyZXNzfX17e2VuZH19JywgY29udGFpbmVyTmFtZV0sXG5cdFx0XHR7XG5cdFx0XHRcdGN3ZCxcblx0XHRcdFx0c2lsZW50OiB0cnVlLFxuXHRcdFx0XHRsaXN0ZW5lcnM6IHtcblx0XHRcdFx0XHRzdGRvdXQ6IChkYXRhKSA9PiBjaHVua3MucHVzaChkYXRhLnRvU3RyaW5nKCkpLFxuXHRcdFx0XHR9LFxuXHRcdFx0fVxuXHRcdClcblxuXHRcdGxldCBpcCA9IGNodW5rcy5qb2luKCcnKS50cmltKClcblx0XHRyZXR1cm4gaXAgfHwgbnVsbFxuXHR9IGNhdGNoIChlcnJvcikge1xuXHRcdHdhcm5pbmcoYEZhaWxlZCB0byBnZXQgY29udGFpbmVyIElQIGZvciAke2NvbnRhaW5lck5hbWV9OiAke1N0cmluZyhlcnJvcil9YClcblx0XHRyZXR1cm4gbnVsbFxuXHR9XG59XG5cbi8qKlxuICogQ29sbGVjdHMgbG9ncyBmcm9tIERvY2tlciBDb21wb3NlIHNlcnZpY2VzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjb2xsZWN0Q29tcG9zZUxvZ3MoY3dkOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuXHR0cnkge1xuXHRcdGxldCBjaHVua3M6IHN0cmluZ1tdID0gW11cblxuXHRcdGF3YWl0IGV4ZWMoYGRvY2tlcmAsIFtgY29tcG9zZWAsIGAtZmAsIGBjb21wb3NlLnltbGAsIGBsb2dzYCwgYC0tbm8tY29sb3JgXSwge1xuXHRcdFx0Y3dkLFxuXHRcdFx0c2lsZW50OiB0cnVlLFxuXHRcdFx0bGlzdGVuZXJzOiB7XG5cdFx0XHRcdHN0ZG91dDogKGRhdGEpID0+IGNodW5rcy5wdXNoKGRhdGEudG9TdHJpbmcoKSksXG5cdFx0XHRcdHN0ZGVycjogKGRhdGEpID0+IGNodW5rcy5wdXNoKGRhdGEudG9TdHJpbmcoKSksXG5cdFx0XHR9LFxuXHRcdH0pXG5cblx0XHRyZXR1cm4gY2h1bmtzLmpvaW4oJycpXG5cdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0d2FybmluZyhgRmFpbGVkIHRvIGNvbGxlY3QgZG9ja2VyIGNvbXBvc2UgbG9nczogJHtTdHJpbmcoZXJyb3IpfWApXG5cdFx0cmV0dXJuICcnXG5cdH1cbn1cblxuLyoqXG4gKiBDb2xsZWN0cyBEb2NrZXIgZXZlbnRzIGZvciBZREIgZGF0YWJhc2Ugbm9kZXNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvbGxlY3REb2NrZXJFdmVudHMob3B0aW9uczogeyBjd2Q6IHN0cmluZzsgc2luY2U6IERhdGU7IHVudGlsOiBEYXRlIH0pOiBQcm9taXNlPERvY2tlckV2ZW50W10+IHtcblx0bGV0IGV2ZW50czogRG9ja2VyRXZlbnRbXSA9IFtdXG5cblx0dHJ5IHtcblx0XHRsZXQgY2h1bmtzOiBzdHJpbmdbXSA9IFtdXG5cblx0XHRhd2FpdCBleGVjKFxuXHRcdFx0YGRvY2tlcmAsXG5cdFx0XHRbXG5cdFx0XHRcdGBldmVudHNgLFxuXHRcdFx0XHRgLS1maWx0ZXJgLFxuXHRcdFx0XHRgbGFiZWw9eWRiLm5vZGUudHlwZT1kYXRhYmFzZWAsXG5cdFx0XHRcdGAtLWZpbHRlcmAsXG5cdFx0XHRcdGBldmVudD1zdG9wYCxcblx0XHRcdFx0YC0tZmlsdGVyYCxcblx0XHRcdFx0YGV2ZW50PXN0YXJ0YCxcblx0XHRcdFx0YC0tZmlsdGVyYCxcblx0XHRcdFx0YGV2ZW50PWtpbGxgLFxuXHRcdFx0XHRgLS1maWx0ZXJgLFxuXHRcdFx0XHRgZXZlbnQ9cmVzdGFydGAsXG5cdFx0XHRcdGAtLXNpbmNlYCxcblx0XHRcdFx0b3B0aW9ucy5zaW5jZS50b0lTT1N0cmluZygpLFxuXHRcdFx0XHRgLS11bnRpbGAsXG5cdFx0XHRcdG9wdGlvbnMudW50aWwudG9JU09TdHJpbmcoKSxcblx0XHRcdFx0YC0tZm9ybWF0YCxcblx0XHRcdFx0YHt7anNvbiAufX1gLFxuXHRcdFx0XSxcblx0XHRcdHtcblx0XHRcdFx0Y3dkOiBvcHRpb25zLmN3ZCxcblx0XHRcdFx0c2lsZW50OiB0cnVlLFxuXHRcdFx0XHRsaXN0ZW5lcnM6IHtcblx0XHRcdFx0XHRzdGRvdXQ6IChkYXRhKSA9PiBjaHVua3MucHVzaChkYXRhLnRvU3RyaW5nKCkpLFxuXHRcdFx0XHR9LFxuXHRcdFx0fVxuXHRcdClcblxuXHRcdGxldCBsaW5lcyA9IGNodW5rcy5qb2luKCcnKS5zcGxpdCgnXFxuJykuZmlsdGVyKEJvb2xlYW4pXG5cdFx0Zm9yIChsZXQgbGluZSBvZiBsaW5lcykge1xuXHRcdFx0ZXZlbnRzLnB1c2goSlNPTi5wYXJzZShsaW5lKSBhcyBEb2NrZXJFdmVudClcblx0XHR9XG5cdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0d2FybmluZyhgRmFpbGVkIHRvIGNvbGxlY3QgRG9ja2VyIGV2ZW50czogJHtTdHJpbmcoZXJyb3IpfWApXG5cdH1cblxuXHRyZXR1cm4gZXZlbnRzXG59XG5cbi8qKlxuICogU3RvcHMgRG9ja2VyIENvbXBvc2UgcHJvamVjdFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3RvcENvbXBvc2UoY3dkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcblx0YXdhaXQgZXhlYyhgZG9ja2VyYCwgW2Bjb21wb3NlYCwgYC1mYCwgYGNvbXBvc2UueW1sYCwgYGRvd25gXSwgeyBjd2QgfSlcbn1cbiIKICBdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBSUE7QUFKQTtBQUNBO0FBQ0E7OztBQ0FBLHNEQUNBO0FBSEE7QUFhQSxlQUFzQixlQUFlLENBQUMsTUFBYyxXQUEyQixLQUE2QjtBQUFBLEVBQzNHLElBQUksaUJBQWlCLElBQUksdUNBQ3JCLGdCQUFnQixPQUFPLFFBQVEsSUFBSSxHQUVuQyxRQUFrQixDQUFDO0FBQUEsRUFFdkIsU0FBUyxZQUFZLFdBQVc7QUFBQSxJQUMvQixJQUFJLENBQUksY0FBVyxTQUFTLElBQUksR0FBRztBQUFBLE1BQ2xDLG9CQUFRLDRCQUE0QixTQUFTLE1BQU07QUFBQSxNQUNuRDtBQUFBO0FBQUEsSUFFRCxNQUFNLEtBQUssU0FBUyxJQUFJO0FBQUE7QUFBQSxFQUd6QixJQUFJLE1BQU0sV0FBVyxHQUFHO0FBQUEs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RUFDdkQ7QUFBQSxFQUVBO0FBQUEsSUFDQyxrQkFBSyxzQkFBc0I7QUFBQSxJQU8zQixJQUFJLFdBTlMsTUFBTSxvQkFBb0I7QUFBQSxNQUN0QztBQUFBLE1BQ0EsT0FBTztBQUFBLE1BQ1AsT0FBTztBQUFBLElBQ1IsQ0FBQyxHQUVvQixJQUFJLENBQUMsTUFBTSxLQUFLLFVBQVUsQ0FBQyxDQUFDLEVBQUUsS0FBSztBQUFBLENBQUk7QUFBQSxJQUN6RCxrQkFBYyxZQUFZLFNBQVMsRUFBRSxVQUFVLFFBQVEsQ0FBQztBQUFBLEVBQzVEO0FBQUEsRUFFQTtBQUFBLElBQ0Msa0JBQUssdUJBQXVCO0FBQUEsSUFFNUIsSUFBSSxhQUFpQyxDQUFDO0FBQUEsSUFFdEMsSUFBSSxhQUFhO0FBQUEsTUFDaEIsSUFBSSxpQkFBaUIsTUFBTSxpQkFBaUIsV0FBVztBQUFBLE1BQ3ZELFdBQVcsS0FBSyxHQUFHLGNBQWM7QUFBQTtBQUFBLElBR2xDLElBQUksbUJBQW1CO0FBQUEsTUFDdEIsSUFBSSxnQkFBZ0IsTUFBTSxpQkFBaUIsaUJBQWlCO0FBQUEsTUFDNUQsV0FBVyxLQUFLLEdBQUcsYUFBYTtBQUFBO0FBQUEsSUFXakMsSUFBSSxXQVJVLE1BQU0sZUFBZTtBQUFBLE1BQ2xDLEtBQUs7QUFBQSxNQUNMLE9BQU8sTUFBTSxRQUFRLElBQUk7QUFBQSxNQUN6QixLQUFLLE9BQU8sUUFBUSxJQUFJO0FBQUEsTUFDeEIsU0FBUztBQUFBLE1BQ1QsU0FBUztBQUFBLElBQ1YsQ0FBQyxHQUVxQixJQUFJLENBQUMsTUFBTSxLQUFLLFVBQVUsQ0FBQyxDQUFDLEVBQUUsS0FBSztBQUFBLENBQUk7QUFBQSxJQUMxRCxrQkFBYyxhQUFhLFNBQVMsRUFBRSxVQUFVLFFBQVEsQ0FBQztBQUFBLEVBQzdEO0FBQUEsRUFHQyxrQkFBSywwQkFBMEIsR0FDL0IsTUFBTSxZQUFZLEdBQUc7QUFBQSxFQUd0QjtBQUFBLElBQ0Msa0JBQUssd0JBQXdCO0FBQUEsSUFFN0IsSUFBSSxZQUE0QjtBQUFBLE1BQy9CLEVBQUUsTUFBTSxHQUFHLHFCQUFxQixNQUFNLFNBQVM7QUFBQSxNQUMvQyxFQUFFLE1BQU0sR0FBRyxxQkFBcUIsTUFBTSxTQUFTO0FBQUEsTUFDL0MsRUFBRSxNQUFNLEdBQUcseUJBQXlCLE1BQU0sV0FBVztBQUFBLE1BQ3JELEVBQUUsTUFBTSxHQUFHLDBCQUEwQixNQUFNLFlBQVk7QUFBQSxJQUN4RDtBQUFBLElBRUEsTUFBTSxnQkFBZ0IsVUFBVSxXQUFXLEdBQUc7QUFBQSxFQUMvQztBQUFBLEVBRUEsa0JBQUssMkJBQTJCLFdBQVcsTUFBTSxRQUFRLENBQUMsSUFBSTtBQUFBO0FBRy9ELEtBQUs7IiwKICAiZGVidWdJZCI6ICIxOTExMUQ4RjE1MEFFQzRFNjQ3NTZFMjE2NDc1NkUyMSIsCiAgIm5hbWVzIjogW10KfQ==
