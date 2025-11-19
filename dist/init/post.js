import {
  require_artifact
} from "../main-bjt997wk.js";
import {
  require_core,
  require_exec
} from "../main-777rh5c8.js";
import {
  __toESM
} from "../main-eyq3236q.js";

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
      "type=container",
      "--filter",
      "label=ydb.node.type=database",
      "--filter",
      "label=ydb.node.type=storage",
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
async function collectChaosEvents(cwd) {
  let events = [];
  try {
    let chunks = [];
    await import_exec.exec("docker", ["cp", "ydb-chaos-monkey:/var/log/chaos-events.jsonl", "-"], {
      cwd,
      silent: !0,
      ignoreReturnCode: !0,
      listeners: {
        stdout: (data) => chunks.push(data.toString())
      }
    });
    let content = chunks.join("");
    if (content) {
      let lines = content.split(`
`).filter(Boolean);
      for (let line of lines)
        try {
          events.push(JSON.parse(line));
        } catch {}
    }
  } catch (error) {
    import_core2.warning(`Failed to collect chaos events: ${String(error)}`);
  }
  return events;
}
async function stopCompose(cwd) {
  await import_exec.exec("docker", ["compose", "-f", "compose.yml", "down"], { cwd });
}

// init/lib/metrics.ts
var import_exec2 = __toESM(require_exec(), 1);

// init/lib/prometheus.ts
async function queryInstant(params) {
  let baseUrl = params.url || "http://localhost:9090", timeout = params.timeout || 30000, url = new URL("/api/v1/query", baseUrl);
  if (url.searchParams.set("query", params.query), params.time !== void 0)
    url.searchParams.set("time", params.time.toString());
  if (params.queryTimeout)
    url.searchParams.set("timeout", params.queryTimeout);
  let response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(timeout)
  }), data = await response.json();
  if (!response.ok)
    throw Error(`Prometheus query failed: ${data.error || response.statusText}`);
  return data;
}
async function queryRange(params) {
  let baseUrl = params.url || "http://localhost:9090", timeout = params.timeout || 30000, url = new URL("/api/v1/query_range", baseUrl);
  if (url.searchParams.set("query", params.query), url.searchParams.set("start", params.start.toString()), url.searchParams.set("end", params.end.toString()), url.searchParams.set("step", params.step), params.queryTimeout)
    url.searchParams.set("timeout", params.queryTimeout);
  let response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(timeout)
  }), data = await response.json();
  if (!response.ok)
    throw Error(`Prometheus range query failed: ${data.error || response.statusText}`);
  return data;
}

// init/lib/metrics.ts
async function parseMetricsYaml(yamlContent) {
  if (!yamlContent || yamlContent.trim() === "")
    return [];
  try {
    let chunks = [];
    await import_exec2.exec("yq", ["-o=json", "."], {
      input: Buffer.from(yamlContent, "utf-8"),
      silent: !0,
      listeners: {
        stdout: (data) => chunks.push(data.toString())
      }
    });
    let json = chunks.join(""), parsed = JSON.parse(json);
    if (Array.isArray(parsed))
      return parsed;
    return [];
  } catch (error) {
    throw Error(`Failed to parse metrics YAML: ${String(error)}`);
  }
}
function calculateOptimalStep(durationSeconds) {
  let stepSeconds = Math.ceil(durationSeconds / 200);
  stepSeconds = Math.max(5, Math.min(60, stepSeconds));
  let niceSteps = [5, 10, 15, 30, 60];
  for (let niceStep of niceSteps)
    if (stepSeconds <= niceStep)
      return `${niceStep}s`;
  return "60s";
}
async function collectMetrics(options) {
  let results = [], durationSeconds = options.end - options.start, defaultStep = calculateOptimalStep(durationSeconds);
  for (let metric of options.metrics)
    try {
      if ((metric.type || "range") === "instant") {
        let response = await queryInstant({
          url: options.url,
          query: metric.query,
          time: metric.time || options.end,
          timeout: options.timeout
        });
        if (response.status === "success" && response.data)
          results.push({
            name: metric.name,
            query: metric.query,
            type: "instant",
            data: response.data.result
          });
      } else {
        let response = await queryRange({
          url: options.url,
          query: metric.query,
          start: options.start,
          end: options.end,
          step: metric.step || defaultStep,
          timeout: options.timeout
        });
        if (response.status === "success" && response.data)
          results.push({
            name: metric.name,
            query: metric.query,
            type: "range",
            data: response.data.result
          });
      }
    } catch {
      continue;
    }
  return results;
}

// init/post.ts
async function post() {
  let cwd = import_core3.getState("cwd"), workload = import_core3.getState("workload"), start = new Date(import_core3.getState("start")), finish = /* @__PURE__ */ new Date, duration = finish.getTime() - start.getTime(), pullPath = import_core3.getState("pull_info_path"), logsPath = path.join(cwd, `${workload}-logs.txt`), eventsPath = path.join(cwd, `${workload}-events.jsonl`), chaosEventsPath = path.join(cwd, `${workload}-chaos-events.jsonl`), metricsPath = path.join(cwd, `${workload}-metrics.jsonl`), prometheusIp = await getContainerIp("prometheus", cwd), prometheusUrl = prometheusIp ? `http://${prometheusIp}:9090` : "http://localhost:9090";
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
    import_core3.info("Collecting docker events...");
    let content = (await collectDockerEvents({
      cwd,
      since: start,
      until: finish
    })).map((e) => JSON.stringify(e)).join(`
`);
    fs2.writeFileSync(eventsPath, content, { encoding: "utf-8" });
  }
  {
    import_core3.info("Collecting chaos events...");
    let chaosEvents = await collectChaosEvents(cwd), content = chaosEvents.map((e) => JSON.stringify(e)).join(`
`);
    fs2.writeFileSync(chaosEventsPath, content, { encoding: "utf-8" }), import_core3.info(`Collected ${chaosEvents.length} chaos events`);
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
      { name: `${workload}-chaos-events.jsonl`, path: chaosEventsPath },
      { name: `${workload}-metrics.jsonl`, path: metricsPath }
    ];
    await uploadArtifacts(workload, artifacts, cwd);
  }
  import_core3.info(`YDB SLO Test duration: ${(duration / 1000).toFixed(1)}s`);
}
post();

//# debugId=8C4358B16371BCEA64756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vaW5pdC9wb3N0LnRzIiwgIi4uL2luaXQvbGliL2FydGlmYWN0cy50cyIsICIuLi9pbml0L2xpYi9kb2NrZXIudHMiLCAiLi4vaW5pdC9saWIvbWV0cmljcy50cyIsICIuLi9pbml0L2xpYi9wcm9tZXRoZXVzLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWwogICAgImltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ25vZGU6cGF0aCdcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICdub2RlOnVybCdcblxuaW1wb3J0IHsgZGVidWcsIGdldElucHV0LCBnZXRTdGF0ZSwgaW5mbywgd2FybmluZyB9IGZyb20gJ0BhY3Rpb25zL2NvcmUnXG5cbmltcG9ydCB7IHVwbG9hZEFydGlmYWN0cywgdHlwZSBBcnRpZmFjdEZpbGUgfSBmcm9tICcuL2xpYi9hcnRpZmFjdHMuanMnXG5pbXBvcnQge1xuXHRjb2xsZWN0Q2hhb3NFdmVudHMsXG5cdGNvbGxlY3RDb21wb3NlTG9ncyxcblx0Y29sbGVjdERvY2tlckV2ZW50cyxcblx0Z2V0Q29udGFpbmVySXAsXG5cdHN0b3BDb21wb3NlLFxufSBmcm9tICcuL2xpYi9kb2NrZXIuanMnXG5pbXBvcnQgeyBjb2xsZWN0TWV0cmljcywgcGFyc2VNZXRyaWNzWWFtbCwgdHlwZSBNZXRyaWNEZWZpbml0aW9uIH0gZnJvbSAnLi9saWIvbWV0cmljcy5qcydcblxuYXN5bmMgZnVuY3Rpb24gcG9zdCgpIHtcblx0bGV0IGN3ZCA9IGdldFN0YXRlKCdjd2QnKVxuXHRsZXQgd29ya2xvYWQgPSBnZXRTdGF0ZSgnd29ya2xvYWQnKVxuXG5cdGxldCBzdGFydCA9IG5ldyBEYXRlKGdldFN0YXRlKCdzdGFydCcpKVxuXHRsZXQgZmluaXNoID0gbmV3IERhdGUoKVxuXHRsZXQgZHVyYXRpb24gPSBmaW5pc2guZ2V0VGltZSgpIC0gc3RhcnQuZ2V0VGltZSgpXG5cblx0bGV0IHB1bGxQYXRoID0gZ2V0U3RhdGUoJ3B1bGxfaW5mb19wYXRoJylcblx0bGV0IGxvZ3NQYXRoID0gcGF0aC5qb2luKGN3ZCwgYCR7d29ya2xvYWR9LWxvZ3MudHh0YClcblx0bGV0IGV2ZW50c1BhdGggPSBwYXRoLmpvaW4oY3dkLCBgJHt3b3JrbG9hZH0tZXZlbnRzLmpzb25sYClcblx0bGV0IGNoYW9zRXZlbnRzUGF0aCA9IHBhdGguam9pbihjd2QsIGAke3dvcmtsb2FkfS1jaGFvcy1ldmVudHMuanNvbmxgKVxuXHRsZXQgbWV0cmljc1BhdGggPSBwYXRoLmpvaW4oY3dkLCBgJHt3b3JrbG9hZH0tbWV0cmljcy5qc29ubGApXG5cblx0bGV0IHByb21ldGhldXNJcCA9IGF3YWl0IGdldENvbnRhaW5lcklwKCdwcm9tZXRoZXVzJywgY3dkKVxuXHRsZXQgcHJvbWV0aGV1c1VybCA9IHByb21ldGhldXNJcCA/IGBodHRwOi8vJHtwcm9tZXRoZXVzSXB9OjkwOTBgIDogJ2h0dHA6Ly9sb2NhbGhvc3Q6OTA5MCdcblx0ZGVidWcoYFByb21ldGhldXMgVVJMOiAke3Byb21ldGhldXNVcmx9YClcblxuXHRsZXQgYWN0aW9uUm9vdCA9IHBhdGgucmVzb2x2ZShwYXRoLmRpcm5hbWUoZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpKSwgJy4uLy4uLycpXG5cdGxldCBkZWZhdWx0TWV0cmljc1BhdGggPSBwYXRoLmpvaW4oYWN0aW9uUm9vdCwgJ2RlcGxveScsICdtZXRyaWNzLnlhbWwnKVxuXG5cdGxldCBtZXRyaWNzWWFtbCA9IGZzLnJlYWRGaWxlU3luYyhkZWZhdWx0TWV0cmljc1BhdGgsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSlcblx0bGV0IGN1c3RvbU1ldHJpY3NZYW1sID0gZ2V0SW5wdXQoJ21ldHJpY3NfeWFtbCcpXG5cblx0aWYgKGdldElucHV0KCdtZXRyaWNzX3lhbWxfcGF0aCcpKSB7XG5cdFx0bGV0IGN1c3RvbU1ldHJpY3NQYXRoID0gZ2V0SW5wdXQoJ21ldHJpY3NfeWFtbF9wYXRoJylcblx0XHRpZiAoIWZzLmV4aXN0c1N5bmMoY3VzdG9tTWV0cmljc1BhdGgpKSB7XG5cdFx0XHR3YXJuaW5nKGBDdXN0b20gbWV0cmljcyBmaWxlIG5vdCBmb3VuZDogJHtjdXN0b21NZXRyaWNzUGF0aH1gKVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRjdXN0b21NZXRyaWNzWWFtbCA9IGZzLnJlYWRGaWxlU3luYyhjdXN0b21NZXRyaWNzUGF0aCwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KVxuXHRcdH1cblx0fVxuXG5cdHtcblx0XHRpbmZvKCdDb2xsZWN0aW5nIGxvZ3MuLi4nKVxuXHRcdGxldCBsb2dzID0gYXdhaXQgY29sbGVjdENvbXBvc2VMb2dzKGN3ZClcblxuXHRcdGZzLndyaXRlRmlsZVN5bmMobG9nc1BhdGgsIGxvZ3MsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSlcblx0fVxuXG5cdHtcblx0XHRpbmZvKCdDb2xsZWN0aW5nIGRvY2tlciBldmVudHMuLi4nKVxuXHRcdGxldCBldmVudHMgPSBhd2FpdCBjb2xsZWN0RG9ja2VyRXZlbnRzKHtcblx0XHRcdGN3ZCxcblx0XHRcdHNpbmNlOiBzdGFydCxcblx0XHRcdHVudGlsOiBmaW5pc2gsXG5cdFx0fSlcblxuXHRcdGxldCBjb250ZW50ID0gZXZlbnRzLm1hcCgoZSkgPT4gSlNPTi5zdHJpbmdpZnkoZSkpLmpvaW4oJ1xcbicpXG5cdFx0ZnMud3JpdGVGaWxlU3luYyhldmVudHNQYXRoLCBjb250ZW50LCB7IGVuY29kaW5nOiAndXRmLTgnIH0pXG5cdH1cblxuXHR7XG5cdFx0aW5mbygnQ29sbGVjdGluZyBjaGFvcyBldmVudHMuLi4nKVxuXHRcdGxldCBjaGFvc0V2ZW50cyA9IGF3YWl0IGNvbGxlY3RDaGFvc0V2ZW50cyhjd2QpXG5cblx0XHRsZXQgY29udGVudCA9IGNoYW9zRXZlbnRzLm1hcCgoZSkgPT4gSlNPTi5zdHJpbmdpZnkoZSkpLmpvaW4oJ1xcbicpXG5cdFx0ZnMud3JpdGVGaWxlU3luYyhjaGFvc0V2ZW50c1BhdGgsIGNvbnRlbnQsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSlcblxuXHRcdGluZm8oYENvbGxlY3RlZCAke2NoYW9zRXZlbnRzLmxlbmd0aH0gY2hhb3MgZXZlbnRzYClcblx0fVxuXG5cdHtcblx0XHRpbmZvKCdDb2xsZWN0aW5nIG1ldHJpY3MuLi4nKVxuXG5cdFx0bGV0IG1ldHJpY3NEZWY6IE1ldHJpY0RlZmluaXRpb25bXSA9IFtdXG5cblx0XHRpZiAobWV0cmljc1lhbWwpIHtcblx0XHRcdGxldCBkZWZhdWx0TWV0cmljcyA9IGF3YWl0IHBhcnNlTWV0cmljc1lhbWwobWV0cmljc1lhbWwpXG5cdFx0XHRtZXRyaWNzRGVmLnB1c2goLi4uZGVmYXVsdE1ldHJpY3MpXG5cdFx0fVxuXG5cdFx0aWYgKGN1c3RvbU1ldHJpY3NZYW1sKSB7XG5cdFx0XHRsZXQgY3VzdG9tTWV0cmljcyA9IGF3YWl0IHBhcnNlTWV0cmljc1lhbWwoY3VzdG9tTWV0cmljc1lhbWwpXG5cdFx0XHRtZXRyaWNzRGVmLnB1c2goLi4uY3VzdG9tTWV0cmljcylcblx0XHR9XG5cblx0XHRsZXQgbWV0cmljcyA9IGF3YWl0IGNvbGxlY3RNZXRyaWNzKHtcblx0XHRcdHVybDogcHJvbWV0aGV1c1VybCxcblx0XHRcdHN0YXJ0OiBzdGFydC5nZXRUaW1lKCkgLyAxMDAwLFxuXHRcdFx0ZW5kOiBmaW5pc2guZ2V0VGltZSgpIC8gMTAwMCxcblx0XHRcdG1ldHJpY3M6IG1ldHJpY3NEZWYsXG5cdFx0XHR0aW1lb3V0OiAzMDAwMCxcblx0XHR9KVxuXG5cdFx0bGV0IGNvbnRlbnQgPSBtZXRyaWNzLm1hcCgobSkgPT4gSlNPTi5zdHJpbmdpZnkobSkpLmpvaW4oJ1xcbicpXG5cdFx0ZnMud3JpdGVGaWxlU3luYyhtZXRyaWNzUGF0aCwgY29udGVudCwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KVxuXHR9XG5cblx0e1xuXHRcdGluZm8oJ1N0b3BwaW5nIFlEQiBzZXJ2aWNlcy4uLicpXG5cdFx0YXdhaXQgc3RvcENvbXBvc2UoY3dkKVxuXHR9XG5cblx0e1xuXHRcdGluZm8oJ1VwbG9hZGluZyBhcnRpZmFjdHMuLi4nKVxuXG5cdFx0bGV0IGFydGlmYWN0czogQXJ0aWZhY3RGaWxlW10gPSBbXG5cdFx0XHR7IG5hbWU6IGAke3dvcmtsb2FkfS1wdWxsLnR4dGAsIHBhdGg6IHB1bGxQYXRoIH0sXG5cdFx0XHR7IG5hbWU6IGAke3dvcmtsb2FkfS1sb2dzLnR4dGAsIHBhdGg6IGxvZ3NQYXRoIH0sXG5cdFx0XHR7IG5hbWU6IGAke3dvcmtsb2FkfS1ldmVudHMuanNvbmxgLCBwYXRoOiBldmVudHNQYXRoIH0sXG5cdFx0XHR7IG5hbWU6IGAke3dvcmtsb2FkfS1jaGFvcy1ldmVudHMuanNvbmxgLCBwYXRoOiBjaGFvc0V2ZW50c1BhdGggfSxcblx0XHRcdHsgbmFtZTogYCR7d29ya2xvYWR9LW1ldHJpY3MuanNvbmxgLCBwYXRoOiBtZXRyaWNzUGF0aCB9LFxuXHRcdF1cblxuXHRcdGF3YWl0IHVwbG9hZEFydGlmYWN0cyh3b3JrbG9hZCwgYXJ0aWZhY3RzLCBjd2QpXG5cdH1cblxuXHRpbmZvKGBZREIgU0xPIFRlc3QgZHVyYXRpb246ICR7KGR1cmF0aW9uIC8gMTAwMCkudG9GaXhlZCgxKX1zYClcbn1cblxucG9zdCgpXG4iLAogICAgImltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMnXG5cbmltcG9ydCB7IERlZmF1bHRBcnRpZmFjdENsaWVudCB9IGZyb20gJ0BhY3Rpb25zL2FydGlmYWN0J1xuaW1wb3J0IHsgaW5mbywgd2FybmluZyB9IGZyb20gJ0BhY3Rpb25zL2NvcmUnXG5cbmV4cG9ydCBpbnRlcmZhY2UgQXJ0aWZhY3RGaWxlIHtcblx0bmFtZTogc3RyaW5nXG5cdHBhdGg6IHN0cmluZ1xufVxuXG4vKipcbiAqIFVwbG9hZHMgYXJ0aWZhY3RzIHRvIEdpdEh1YiBBY3Rpb25zIGFzIGEgc2luZ2xlIGJ1bmRsZVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBsb2FkQXJ0aWZhY3RzKG5hbWU6IHN0cmluZywgYXJ0aWZhY3RzOiBBcnRpZmFjdEZpbGVbXSwgY3dkPzogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG5cdGxldCBhcnRpZmFjdENsaWVudCA9IG5ldyBEZWZhdWx0QXJ0aWZhY3RDbGllbnQoKVxuXHRsZXQgcm9vdERpcmVjdG9yeSA9IGN3ZCB8fCBwcm9jZXNzLmN3ZCgpXG5cblx0bGV0IGZpbGVzOiBzdHJpbmdbXSA9IFtdXG5cblx0Zm9yIChsZXQgYXJ0aWZhY3Qgb2YgYXJ0aWZhY3RzKSB7XG5cdFx0aWYgKCFmcy5leGlzdHNTeW5jKGFydGlmYWN0LnBhdGgpKSB7XG5cdFx0XHR3YXJuaW5nKGBBcnRpZmFjdCBzb3VyY2UgbWlzc2luZzogJHthcnRpZmFjdC5wYXRofWApXG5cdFx0XHRjb250aW51ZVxuXHRcdH1cblx0XHRmaWxlcy5wdXNoKGFydGlmYWN0LnBhdGgpXG5cdH1cblxuXHRpZiAoZmlsZXMubGVuZ3RoID09PSAwKSB7XG5cdFx0d2FybmluZygnTm8gYXJ0aWZhY3RzIHRvIHVwbG9hZCcpXG5cdFx0cmV0dXJuXG5cdH1cblxuXHR0cnkge1xuXHRcdC8vIEtlZXAgYXJ0aWZhY3RzIGZvciAxIGRheSBvbmx5IHRvIHNhdmUgc3RvcmFnZSBzcGFjZVxuXHRcdGxldCB7IGlkIH0gPSBhd2FpdCBhcnRpZmFjdENsaWVudC51cGxvYWRBcnRpZmFjdChuYW1lLCBmaWxlcywgcm9vdERpcmVjdG9yeSwge1xuXHRcdFx0cmV0ZW50aW9uRGF5czogMSxcblx0XHR9KVxuXG5cdFx0aW5mbyhgVXBsb2FkZWQgJHtmaWxlcy5sZW5ndGh9IGZpbGUocykgYXMgYXJ0aWZhY3QgJHtuYW1lfSAoaWQ6ICR7aWR9KWApXG5cdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0d2FybmluZyhgRmFpbGVkIHRvIHVwbG9hZCBhcnRpZmFjdHM6ICR7U3RyaW5nKGVycm9yKX1gKVxuXHR9XG59XG4iLAogICAgImltcG9ydCB7IHdhcm5pbmcgfSBmcm9tICdAYWN0aW9ucy9jb3JlJ1xuaW1wb3J0IHsgZXhlYyB9IGZyb20gJ0BhY3Rpb25zL2V4ZWMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgRG9ja2VyRXZlbnQge1xuXHRzdGF0dXM6IHN0cmluZ1xuXHRpZDogc3RyaW5nXG5cdGZyb206IHN0cmluZ1xuXHRUeXBlOiBzdHJpbmdcblx0QWN0aW9uOiBzdHJpbmdcblx0QWN0b3I6IHtcblx0XHRJRDogc3RyaW5nXG5cdFx0QXR0cmlidXRlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuXHR9XG5cdHNjb3BlOiBzdHJpbmdcblx0dGltZTogbnVtYmVyXG5cdHRpbWVOYW5vOiBudW1iZXJcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDaGFvc0V2ZW50IHtcblx0dGltZXN0YW1wOiBzdHJpbmdcblx0ZXBvY2hfbXM6IG51bWJlclxuXHRzY3JpcHQ6IHN0cmluZ1xuXHRkZXNjcmlwdGlvbjogc3RyaW5nXG5cdGR1cmF0aW9uX21zPzogbnVtYmVyXG59XG5cbi8qKlxuICogR2V0cyBJUCBhZGRyZXNzIG9mIGEgRG9ja2VyIGNvbnRhaW5lclxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0Q29udGFpbmVySXAoY29udGFpbmVyTmFtZTogc3RyaW5nLCBjd2Q6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuXHR0cnkge1xuXHRcdGxldCBjaHVua3M6IHN0cmluZ1tdID0gW11cblxuXHRcdGF3YWl0IGV4ZWMoXG5cdFx0XHQnZG9ja2VyJyxcblx0XHRcdFsnaW5zcGVjdCcsICctZicsICd7e3JhbmdlIC5OZXR3b3JrU2V0dGluZ3MuTmV0d29ya3N9fXt7LklQQWRkcmVzc319e3tlbmR9fScsIGNvbnRhaW5lck5hbWVdLFxuXHRcdFx0e1xuXHRcdFx0XHRjd2QsXG5cdFx0XHRcdHNpbGVudDogdHJ1ZSxcblx0XHRcdFx0bGlzdGVuZXJzOiB7XG5cdFx0XHRcdFx0c3Rkb3V0OiAoZGF0YSkgPT4gY2h1bmtzLnB1c2goZGF0YS50b1N0cmluZygpKSxcblx0XHRcdFx0fSxcblx0XHRcdH1cblx0XHQpXG5cblx0XHRsZXQgaXAgPSBjaHVua3Muam9pbignJykudHJpbSgpXG5cdFx0cmV0dXJuIGlwIHx8IG51bGxcblx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHR3YXJuaW5nKGBGYWlsZWQgdG8gZ2V0IGNvbnRhaW5lciBJUCBmb3IgJHtjb250YWluZXJOYW1lfTogJHtTdHJpbmcoZXJyb3IpfWApXG5cdFx0cmV0dXJuIG51bGxcblx0fVxufVxuXG4vKipcbiAqIENvbGxlY3RzIGxvZ3MgZnJvbSBEb2NrZXIgQ29tcG9zZSBzZXJ2aWNlc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY29sbGVjdENvbXBvc2VMb2dzKGN3ZDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcblx0dHJ5IHtcblx0XHRsZXQgY2h1bmtzOiBzdHJpbmdbXSA9IFtdXG5cblx0XHRhd2FpdCBleGVjKGBkb2NrZXJgLCBbYGNvbXBvc2VgLCBgLWZgLCBgY29tcG9zZS55bWxgLCBgbG9nc2AsIGAtLW5vLWNvbG9yYF0sIHtcblx0XHRcdGN3ZCxcblx0XHRcdHNpbGVudDogdHJ1ZSxcblx0XHRcdGxpc3RlbmVyczoge1xuXHRcdFx0XHRzdGRvdXQ6IChkYXRhKSA9PiBjaHVua3MucHVzaChkYXRhLnRvU3RyaW5nKCkpLFxuXHRcdFx0XHRzdGRlcnI6IChkYXRhKSA9PiBjaHVua3MucHVzaChkYXRhLnRvU3RyaW5nKCkpLFxuXHRcdFx0fSxcblx0XHR9KVxuXG5cdFx0cmV0dXJuIGNodW5rcy5qb2luKCcnKVxuXHR9IGNhdGNoIChlcnJvcikge1xuXHRcdHdhcm5pbmcoYEZhaWxlZCB0byBjb2xsZWN0IGRvY2tlciBjb21wb3NlIGxvZ3M6ICR7U3RyaW5nKGVycm9yKX1gKVxuXHRcdHJldHVybiAnJ1xuXHR9XG59XG5cbi8qKlxuICogQ29sbGVjdHMgRG9ja2VyIGV2ZW50cyBmb3IgWURCIGRhdGFiYXNlIG5vZGVzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjb2xsZWN0RG9ja2VyRXZlbnRzKG9wdGlvbnM6IHsgY3dkOiBzdHJpbmc7IHNpbmNlOiBEYXRlOyB1bnRpbDogRGF0ZSB9KTogUHJvbWlzZTxEb2NrZXJFdmVudFtdPiB7XG5cdGxldCBldmVudHM6IERvY2tlckV2ZW50W10gPSBbXVxuXG5cdHRyeSB7XG5cdFx0bGV0IGNodW5rczogc3RyaW5nW10gPSBbXVxuXG5cdFx0Ly8gcHJldHRpZXItaWdub3JlXG5cdFx0YXdhaXQgZXhlYyhcblx0XHRcdGBkb2NrZXJgLFxuXHRcdFx0W1xuXHRcdFx0XHRgZXZlbnRzYCxcblx0XHRcdFx0YC0tZmlsdGVyYCxcdGB0eXBlPWNvbnRhaW5lcmAsXG5cdFx0XHRcdGAtLWZpbHRlcmAsXHRgbGFiZWw9eWRiLm5vZGUudHlwZT1kYXRhYmFzZWAsXG5cdFx0XHRcdGAtLWZpbHRlcmAsXHRgbGFiZWw9eWRiLm5vZGUudHlwZT1zdG9yYWdlYCxcblx0XHRcdFx0YC0tc2luY2VgLFx0b3B0aW9ucy5zaW5jZS50b0lTT1N0cmluZygpLFxuXHRcdFx0XHRgLS11bnRpbGAsXHRvcHRpb25zLnVudGlsLnRvSVNPU3RyaW5nKCksXG5cdFx0XHRcdGAtLWZvcm1hdGAsXHRge3tqc29uIC59fWAsXG5cdFx0XHRdLFxuXHRcdFx0e1xuXHRcdFx0XHRjd2Q6IG9wdGlvbnMuY3dkLFxuXHRcdFx0XHRzaWxlbnQ6IHRydWUsXG5cdFx0XHRcdGxpc3RlbmVyczoge1xuXHRcdFx0XHRcdHN0ZG91dDogKGRhdGEpID0+IGNodW5rcy5wdXNoKGRhdGEudG9TdHJpbmcoKSksXG5cdFx0XHRcdH0sXG5cdFx0XHR9XG5cdFx0KVxuXG5cdFx0bGV0IGxpbmVzID0gY2h1bmtzLmpvaW4oJycpLnNwbGl0KCdcXG4nKS5maWx0ZXIoQm9vbGVhbilcblx0XHRmb3IgKGxldCBsaW5lIG9mIGxpbmVzKSB7XG5cdFx0XHRldmVudHMucHVzaChKU09OLnBhcnNlKGxpbmUpIGFzIERvY2tlckV2ZW50KVxuXHRcdH1cblx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHR3YXJuaW5nKGBGYWlsZWQgdG8gY29sbGVjdCBEb2NrZXIgZXZlbnRzOiAke1N0cmluZyhlcnJvcil9YClcblx0fVxuXG5cdHJldHVybiBldmVudHNcbn1cblxuLyoqXG4gKiBDb2xsZWN0cyBjaGFvcyBldmVudHMgZnJvbSBjaGFvcy1tb25rZXkgY29udGFpbmVyXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjb2xsZWN0Q2hhb3NFdmVudHMoY3dkOiBzdHJpbmcpOiBQcm9taXNlPENoYW9zRXZlbnRbXT4ge1xuXHRsZXQgZXZlbnRzOiBDaGFvc0V2ZW50W10gPSBbXVxuXG5cdHRyeSB7XG5cdFx0bGV0IGNodW5rczogc3RyaW5nW10gPSBbXVxuXG5cdFx0Ly8gQ29weSBldmVudHMgZmlsZSBmcm9tIGNoYW9zLW1vbmtleSBjb250YWluZXIgdm9sdW1lXG5cdFx0Ly8gVGhlIGZpbGUgaXMgaW4gYSBuYW1lZCB2b2x1bWUsIHNvIHdlIGNvcHkgaXQgZnJvbSB0aGUgY29udGFpbmVyXG5cdFx0YXdhaXQgZXhlYyhgZG9ja2VyYCwgW2BjcGAsIGB5ZGItY2hhb3MtbW9ua2V5Oi92YXIvbG9nL2NoYW9zLWV2ZW50cy5qc29ubGAsIGAtYF0sIHtcblx0XHRcdGN3ZCxcblx0XHRcdHNpbGVudDogdHJ1ZSxcblx0XHRcdGlnbm9yZVJldHVybkNvZGU6IHRydWUsIC8vIEZpbGUgbWlnaHQgbm90IGV4aXN0IGlmIGNoYW9zLW1vbmtleSBoYXNuJ3QgcnVuIHlldFxuXHRcdFx0bGlzdGVuZXJzOiB7XG5cdFx0XHRcdHN0ZG91dDogKGRhdGEpID0+IGNodW5rcy5wdXNoKGRhdGEudG9TdHJpbmcoKSksXG5cdFx0XHR9LFxuXHRcdH0pXG5cblx0XHRsZXQgY29udGVudCA9IGNodW5rcy5qb2luKCcnKVxuXHRcdGlmIChjb250ZW50KSB7XG5cdFx0XHRsZXQgbGluZXMgPSBjb250ZW50LnNwbGl0KCdcXG4nKS5maWx0ZXIoQm9vbGVhbilcblx0XHRcdGZvciAobGV0IGxpbmUgb2YgbGluZXMpIHtcblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRldmVudHMucHVzaChKU09OLnBhcnNlKGxpbmUpIGFzIENoYW9zRXZlbnQpXG5cdFx0XHRcdH0gY2F0Y2gge1xuXHRcdFx0XHRcdC8vIFNraXAgaW52YWxpZCBKU09OIGxpbmVzXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0d2FybmluZyhgRmFpbGVkIHRvIGNvbGxlY3QgY2hhb3MgZXZlbnRzOiAke1N0cmluZyhlcnJvcil9YClcblx0fVxuXG5cdHJldHVybiBldmVudHNcbn1cblxuLyoqXG4gKiBTdG9wcyBEb2NrZXIgQ29tcG9zZSBwcm9qZWN0XG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzdG9wQ29tcG9zZShjd2Q6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuXHRhd2FpdCBleGVjKGBkb2NrZXJgLCBbYGNvbXBvc2VgLCBgLWZgLCBgY29tcG9zZS55bWxgLCBgZG93bmBdLCB7IGN3ZCB9KVxufVxuIiwKICAgICJpbXBvcnQgeyBleGVjIH0gZnJvbSAnQGFjdGlvbnMvZXhlYydcblxuaW1wb3J0IHsgcXVlcnlJbnN0YW50LCBxdWVyeVJhbmdlLCB0eXBlIFByb21ldGhldXNJbnN0YW50VmFsdWUsIHR5cGUgUHJvbWV0aGV1c1JhbmdlVmFsdWUgfSBmcm9tICcuL3Byb21ldGhldXMuanMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgTWV0cmljRGVmaW5pdGlvbiB7XG5cdG5hbWU6IHN0cmluZ1xuXHRxdWVyeTogc3RyaW5nXG5cdHR5cGU/OiAncmFuZ2UnIHwgJ2luc3RhbnQnXG5cdHN0ZXA/OiBzdHJpbmdcblx0dGltZT86IG51bWJlclxufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbGxlY3RlZE1ldHJpYyB7XG5cdG5hbWU6IHN0cmluZ1xuXHRxdWVyeTogc3RyaW5nXG5cdHR5cGU6ICdyYW5nZScgfCAnaW5zdGFudCdcblx0ZGF0YTogUHJvbWV0aGV1c1JhbmdlVmFsdWVbXSB8IFByb21ldGhldXNJbnN0YW50VmFsdWVbXVxufVxuXG4vKipcbiAqIFN1cHBvcnRzIHR3byBZQU1MIGZvcm1hdHMgZm9yIGZsZXhpYmlsaXR5OlxuICogLSBBcnJheSBhdCByb290OiBbeyBuYW1lOiAuLi4sIHF1ZXJ5OiAuLi4gfV1cbiAqIC0gT2JqZWN0IHdpdGggbWV0cmljcyBmaWVsZDogeyBtZXRyaWNzOiBbeyBuYW1lOiAuLi4sIHF1ZXJ5OiAuLi4gfV0gfVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcGFyc2VNZXRyaWNzWWFtbCh5YW1sQ29udGVudDogc3RyaW5nKTogUHJvbWlzZTxNZXRyaWNEZWZpbml0aW9uW10+IHtcblx0aWYgKCF5YW1sQ29udGVudCB8fCB5YW1sQ29udGVudC50cmltKCkgPT09ICcnKSB7XG5cdFx0cmV0dXJuIFtdXG5cdH1cblxuXHR0cnkge1xuXHRcdGxldCBjaHVua3M6IHN0cmluZ1tdID0gW11cblxuXHRcdGF3YWl0IGV4ZWMoJ3lxJywgWyctbz1qc29uJywgJy4nXSwge1xuXHRcdFx0aW5wdXQ6IEJ1ZmZlci5mcm9tKHlhbWxDb250ZW50LCAndXRmLTgnKSxcblx0XHRcdHNpbGVudDogdHJ1ZSxcblx0XHRcdGxpc3RlbmVyczoge1xuXHRcdFx0XHRzdGRvdXQ6IChkYXRhKSA9PiBjaHVua3MucHVzaChkYXRhLnRvU3RyaW5nKCkpLFxuXHRcdFx0fSxcblx0XHR9KVxuXG5cdFx0bGV0IGpzb24gPSBjaHVua3Muam9pbignJylcblx0XHRsZXQgcGFyc2VkID0gSlNPTi5wYXJzZShqc29uKVxuXG5cdFx0aWYgKEFycmF5LmlzQXJyYXkocGFyc2VkKSkge1xuXHRcdFx0cmV0dXJuIHBhcnNlZFxuXHRcdH1cblxuXHRcdHJldHVybiBbXVxuXHR9IGNhdGNoIChlcnJvcikge1xuXHRcdHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHBhcnNlIG1ldHJpY3MgWUFNTDogJHtTdHJpbmcoZXJyb3IpfWApXG5cdH1cbn1cblxuLyoqXG4gKiBDYWxjdWxhdGVzIG9wdGltYWwgc3RlcCB0byBnZXQgfjIwMCBkYXRhIHBvaW50cyByZWdhcmRsZXNzIG9mIHRlc3QgZHVyYXRpb24uXG4gKiBUaGlzIHByb3ZpZGVzIGdvb2QgY2hhcnQgcmVzb2x1dGlvbiB3aXRob3V0IG92ZXJsb2FkaW5nIFByb21ldGhldXMuXG4gKi9cbmZ1bmN0aW9uIGNhbGN1bGF0ZU9wdGltYWxTdGVwKGR1cmF0aW9uU2Vjb25kczogbnVtYmVyKTogc3RyaW5nIHtcblx0bGV0IHRhcmdldFBvaW50cyA9IDIwMFxuXHRsZXQgc3RlcFNlY29uZHMgPSBNYXRoLmNlaWwoZHVyYXRpb25TZWNvbmRzIC8gdGFyZ2V0UG9pbnRzKVxuXG5cdHN0ZXBTZWNvbmRzID0gTWF0aC5tYXgoNSwgTWF0aC5taW4oNjAsIHN0ZXBTZWNvbmRzKSlcblxuXHQvLyBSb3VuZCB0byBjb21tb24gaW50ZXJ2YWxzIGZvciBiZXR0ZXIgYWxpZ25tZW50IHdpdGggc2NyYXBlIGludGVydmFsc1xuXHRsZXQgbmljZVN0ZXBzID0gWzUsIDEwLCAxNSwgMzAsIDYwXVxuXHRmb3IgKGxldCBuaWNlU3RlcCBvZiBuaWNlU3RlcHMpIHtcblx0XHRpZiAoc3RlcFNlY29uZHMgPD0gbmljZVN0ZXApIHtcblx0XHRcdHJldHVybiBgJHtuaWNlU3RlcH1zYFxuXHRcdH1cblx0fVxuXG5cdHJldHVybiAnNjBzJ1xufVxuXG4vKipcbiAqIENvbGxlY3RzIG1ldHJpY3MgZnJvbSBQcm9tZXRoZXVzIHVzaW5nIHByb3ZpZGVkIG1ldHJpYyBkZWZpbml0aW9uc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY29sbGVjdE1ldHJpY3Mob3B0aW9uczoge1xuXHR1cmw6IHN0cmluZ1xuXHRzdGFydDogbnVtYmVyXG5cdGVuZDogbnVtYmVyXG5cdG1ldHJpY3M6IE1ldHJpY0RlZmluaXRpb25bXVxuXHR0aW1lb3V0OiBudW1iZXJcbn0pOiBQcm9taXNlPENvbGxlY3RlZE1ldHJpY1tdPiB7XG5cdGxldCByZXN1bHRzOiBDb2xsZWN0ZWRNZXRyaWNbXSA9IFtdXG5cblx0bGV0IGR1cmF0aW9uU2Vjb25kcyA9IG9wdGlvbnMuZW5kIC0gb3B0aW9ucy5zdGFydFxuXHRsZXQgZGVmYXVsdFN0ZXAgPSBjYWxjdWxhdGVPcHRpbWFsU3RlcChkdXJhdGlvblNlY29uZHMpXG5cblx0Zm9yIChsZXQgbWV0cmljIG9mIG9wdGlvbnMubWV0cmljcykge1xuXHRcdHRyeSB7XG5cdFx0XHRsZXQgdHlwZSA9IG1ldHJpYy50eXBlIHx8ICdyYW5nZSdcblxuXHRcdFx0aWYgKHR5cGUgPT09ICdpbnN0YW50Jykge1xuXHRcdFx0XHRsZXQgcmVzcG9uc2UgPSBhd2FpdCBxdWVyeUluc3RhbnQoe1xuXHRcdFx0XHRcdHVybDogb3B0aW9ucy51cmwsXG5cdFx0XHRcdFx0cXVlcnk6IG1ldHJpYy5xdWVyeSxcblx0XHRcdFx0XHR0aW1lOiBtZXRyaWMudGltZSB8fCBvcHRpb25zLmVuZCxcblx0XHRcdFx0XHR0aW1lb3V0OiBvcHRpb25zLnRpbWVvdXQsXG5cdFx0XHRcdH0pXG5cblx0XHRcdFx0aWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gJ3N1Y2Nlc3MnICYmIHJlc3BvbnNlLmRhdGEpIHtcblx0XHRcdFx0XHRyZXN1bHRzLnB1c2goe1xuXHRcdFx0XHRcdFx0bmFtZTogbWV0cmljLm5hbWUsXG5cdFx0XHRcdFx0XHRxdWVyeTogbWV0cmljLnF1ZXJ5LFxuXHRcdFx0XHRcdFx0dHlwZTogJ2luc3RhbnQnLFxuXHRcdFx0XHRcdFx0ZGF0YTogcmVzcG9uc2UuZGF0YS5yZXN1bHQsXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bGV0IHJlc3BvbnNlID0gYXdhaXQgcXVlcnlSYW5nZSh7XG5cdFx0XHRcdFx0dXJsOiBvcHRpb25zLnVybCxcblx0XHRcdFx0XHRxdWVyeTogbWV0cmljLnF1ZXJ5LFxuXHRcdFx0XHRcdHN0YXJ0OiBvcHRpb25zLnN0YXJ0LFxuXHRcdFx0XHRcdGVuZDogb3B0aW9ucy5lbmQsXG5cdFx0XHRcdFx0c3RlcDogbWV0cmljLnN0ZXAgfHwgZGVmYXVsdFN0ZXAsXG5cdFx0XHRcdFx0dGltZW91dDogb3B0aW9ucy50aW1lb3V0LFxuXHRcdFx0XHR9KVxuXG5cdFx0XHRcdGlmIChyZXNwb25zZS5zdGF0dXMgPT09ICdzdWNjZXNzJyAmJiByZXNwb25zZS5kYXRhKSB7XG5cdFx0XHRcdFx0cmVzdWx0cy5wdXNoKHtcblx0XHRcdFx0XHRcdG5hbWU6IG1ldHJpYy5uYW1lLFxuXHRcdFx0XHRcdFx0cXVlcnk6IG1ldHJpYy5xdWVyeSxcblx0XHRcdFx0XHRcdHR5cGU6ICdyYW5nZScsXG5cdFx0XHRcdFx0XHRkYXRhOiByZXNwb25zZS5kYXRhLnJlc3VsdCxcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBjYXRjaCB7XG5cdFx0XHRjb250aW51ZVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiByZXN1bHRzXG59XG4iLAogICAgImV4cG9ydCB0eXBlIFByb21ldGhldXNWYWx1ZVR5cGUgPSAnbWF0cml4JyB8ICd2ZWN0b3InIHwgJ3NjYWxhcicgfCAnc3RyaW5nJ1xuXG5leHBvcnQgaW50ZXJmYWNlIFByb21ldGhldXNNZXRyaWMge1xuXHRbbGFiZWw6IHN0cmluZ106IHN0cmluZ1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFByb21ldGhldXNJbnN0YW50VmFsdWUge1xuXHRtZXRyaWM6IFByb21ldGhldXNNZXRyaWNcblx0dmFsdWU6IFtudW1iZXIsIHN0cmluZ11cbn1cblxuZXhwb3J0IGludGVyZmFjZSBQcm9tZXRoZXVzUmFuZ2VWYWx1ZSB7XG5cdG1ldHJpYzogUHJvbWV0aGV1c01ldHJpY1xuXHR2YWx1ZXM6IEFycmF5PFtudW1iZXIsIHN0cmluZ10+XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJvbWV0aGV1c1NjYWxhclZhbHVlIHtcblx0dmFsdWU6IFtudW1iZXIsIHN0cmluZ11cbn1cblxuZXhwb3J0IGludGVyZmFjZSBQcm9tZXRoZXVzUmVzcG9uc2U8VCA9IFByb21ldGhldXNJbnN0YW50VmFsdWUgfCBQcm9tZXRoZXVzUmFuZ2VWYWx1ZT4ge1xuXHRzdGF0dXM6ICdzdWNjZXNzJyB8ICdlcnJvcidcblx0ZGF0YT86IHtcblx0XHRyZXN1bHRUeXBlOiBQcm9tZXRoZXVzVmFsdWVUeXBlXG5cdFx0cmVzdWx0OiBUW11cblx0fVxuXHRlcnJvclR5cGU/OiBzdHJpbmdcblx0ZXJyb3I/OiBzdHJpbmdcblx0d2FybmluZ3M/OiBzdHJpbmdbXVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFByb21ldGhldXNRdWVyeU9wdGlvbnMge1xuXHR1cmw/OiBzdHJpbmdcblx0dGltZW91dD86IG51bWJlclxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFByb21ldGhldXNJbnN0YW50UXVlcnlQYXJhbXMgZXh0ZW5kcyBQcm9tZXRoZXVzUXVlcnlPcHRpb25zIHtcblx0cXVlcnk6IHN0cmluZ1xuXHR0aW1lPzogc3RyaW5nIHwgbnVtYmVyXG5cdHF1ZXJ5VGltZW91dD86IHN0cmluZ1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFByb21ldGhldXNSYW5nZVF1ZXJ5UGFyYW1zIGV4dGVuZHMgUHJvbWV0aGV1c1F1ZXJ5T3B0aW9ucyB7XG5cdHF1ZXJ5OiBzdHJpbmdcblx0c3RhcnQ6IHN0cmluZyB8IG51bWJlclxuXHRlbmQ6IHN0cmluZyB8IG51bWJlclxuXHRzdGVwOiBzdHJpbmdcblx0cXVlcnlUaW1lb3V0Pzogc3RyaW5nXG59XG5cbi8qKlxuICogRXhlY3V0ZXMgaW5zdGFudCBQcm9tUUwgcXVlcnkgYXQgYSBzcGVjaWZpYyBwb2ludCBpbiB0aW1lXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBxdWVyeUluc3RhbnQoXG5cdHBhcmFtczogUHJvbWV0aGV1c0luc3RhbnRRdWVyeVBhcmFtc1xuKTogUHJvbWlzZTxQcm9tZXRoZXVzUmVzcG9uc2U8UHJvbWV0aGV1c0luc3RhbnRWYWx1ZT4+IHtcblx0bGV0IGJhc2VVcmwgPSBwYXJhbXMudXJsIHx8ICdodHRwOi8vbG9jYWxob3N0OjkwOTAnXG5cdGxldCB0aW1lb3V0ID0gcGFyYW1zLnRpbWVvdXQgfHwgMzAwMDBcblxuXHRsZXQgdXJsID0gbmV3IFVSTCgnL2FwaS92MS9xdWVyeScsIGJhc2VVcmwpXG5cdHVybC5zZWFyY2hQYXJhbXMuc2V0KCdxdWVyeScsIHBhcmFtcy5xdWVyeSlcblxuXHRpZiAocGFyYW1zLnRpbWUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHVybC5zZWFyY2hQYXJhbXMuc2V0KCd0aW1lJywgcGFyYW1zLnRpbWUudG9TdHJpbmcoKSlcblx0fVxuXG5cdGlmIChwYXJhbXMucXVlcnlUaW1lb3V0KSB7XG5cdFx0dXJsLnNlYXJjaFBhcmFtcy5zZXQoJ3RpbWVvdXQnLCBwYXJhbXMucXVlcnlUaW1lb3V0KVxuXHR9XG5cblx0bGV0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLnRvU3RyaW5nKCksIHtcblx0XHRzaWduYWw6IEFib3J0U2lnbmFsLnRpbWVvdXQodGltZW91dCksXG5cdH0pXG5cblx0bGV0IGRhdGEgPSAoYXdhaXQgcmVzcG9uc2UuanNvbigpKSBhcyBQcm9tZXRoZXVzUmVzcG9uc2U8UHJvbWV0aGV1c0luc3RhbnRWYWx1ZT5cblxuXHRpZiAoIXJlc3BvbnNlLm9rKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBQcm9tZXRoZXVzIHF1ZXJ5IGZhaWxlZDogJHtkYXRhLmVycm9yIHx8IHJlc3BvbnNlLnN0YXR1c1RleHR9YClcblx0fVxuXG5cdHJldHVybiBkYXRhXG59XG5cbi8qKlxuICogRXhlY3V0ZXMgUHJvbVFMIHJhbmdlIHF1ZXJ5IG92ZXIgYSB0aW1lIHBlcmlvZFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcXVlcnlSYW5nZShcblx0cGFyYW1zOiBQcm9tZXRoZXVzUmFuZ2VRdWVyeVBhcmFtc1xuKTogUHJvbWlzZTxQcm9tZXRoZXVzUmVzcG9uc2U8UHJvbWV0aGV1c1JhbmdlVmFsdWU+PiB7XG5cdGxldCBiYXNlVXJsID0gcGFyYW1zLnVybCB8fCAnaHR0cDovL2xvY2FsaG9zdDo5MDkwJ1xuXHRsZXQgdGltZW91dCA9IHBhcmFtcy50aW1lb3V0IHx8IDMwMDAwXG5cblx0bGV0IHVybCA9IG5ldyBVUkwoJy9hcGkvdjEvcXVlcnlfcmFuZ2UnLCBiYXNlVXJsKVxuXHR1cmwuc2VhcmNoUGFyYW1zLnNldCgncXVlcnknLCBwYXJhbXMucXVlcnkpXG5cdHVybC5zZWFyY2hQYXJhbXMuc2V0KCdzdGFydCcsIHBhcmFtcy5zdGFydC50b1N0cmluZygpKVxuXHR1cmwuc2VhcmNoUGFyYW1zLnNldCgnZW5kJywgcGFyYW1zLmVuZC50b1N0cmluZygpKVxuXHR1cmwuc2VhcmNoUGFyYW1zLnNldCgnc3RlcCcsIHBhcmFtcy5zdGVwKVxuXG5cdGlmIChwYXJhbXMucXVlcnlUaW1lb3V0KSB7XG5cdFx0dXJsLnNlYXJjaFBhcmFtcy5zZXQoJ3RpbWVvdXQnLCBwYXJhbXMucXVlcnlUaW1lb3V0KVxuXHR9XG5cblx0bGV0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLnRvU3RyaW5nKCksIHtcblx0XHRzaWduYWw6IEFib3J0U2lnbmFsLnRpbWVvdXQodGltZW91dCksXG5cdH0pXG5cblx0bGV0IGRhdGEgPSAoYXdhaXQgcmVzcG9uc2UuanNvbigpKSBhcyBQcm9tZXRoZXVzUmVzcG9uc2U8UHJvbWV0aGV1c1JhbmdlVmFsdWU+XG5cblx0aWYgKCFyZXNwb25zZS5vaykge1xuXHRcdHRocm93IG5ldyBFcnJvcihgUHJvbWV0aGV1cyByYW5nZSBxdWVyeSBmYWlsZWQ6ICR7ZGF0YS5lcnJvciB8fCByZXNwb25zZS5zdGF0dXNUZXh0fWApXG5cdH1cblxuXHRyZXR1cm4gZGF0YVxufVxuIgogIF0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7O0FBSUE7QUFKQTtBQUNBO0FBQ0E7OztBQ0FBLHNEQUNBO0FBSEE7QUFhQSxlQUFzQixlQUFlLENBQUMsTUFBYyxXQUEyQixLQUE2QjtBQUFBLEVBQzNHLElBQUksaUJBQWlCLElBQUksdUNBQ3JCLGdCQUFnQixPQUFPLFFBQVEsSUFBSSxHQUVuQyxRQUFrQixDQUFDO0FBQUEsRUFFdkIsU0FBUyxZQUFZLFdBQVc7QUFBQSxJQUMvQixJQUFJLENBQUksY0FBVyxTQUFTLElBQUksR0FB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QUFBLElBQ3pELGtCQUFjLFlBQVksU0FBUyxFQUFFLFVBQVUsUUFBUSxDQUFDO0FBQUEsRUFDNUQ7QUFBQSxFQUVBO0FBQUEsSUFDQyxrQkFBSyw0QkFBNEI7QUFBQSxJQUNqQyxJQUFJLGNBQWMsTUFBTSxtQkFBbUIsR0FBRyxHQUUxQyxVQUFVLFlBQVksSUFBSSxDQUFDLE1BQU0sS0FBSyxVQUFVLENBQUMsQ0FBQyxFQUFFLEtBQUs7QUFBQSxDQUFJO0FBQUEsSUFDOUQsa0JBQWMsaUJBQWlCLFNBQVMsRUFBRSxVQUFVLFFBQVEsQ0FBQyxHQUVoRSxrQkFBSyxhQUFhLFlBQVkscUJBQXFCO0FBQUEsRUFDcEQ7QUFBQSxFQUVBO0FBQUEsSUFDQyxrQkFBSyx1QkFBdUI7QUFBQSxJQUU1QixJQUFJLGFBQWlDLENBQUM7QUFBQSxJQUV0QyxJQUFJLGFBQWE7QUFBQSxNQUNoQixJQUFJLGlCQUFpQixNQUFNLGlCQUFpQixXQUFXO0FBQUEsTUFDdkQsV0FBVyxLQUFLLEdBQUcsY0FBYztBQUFBO0FBQUEsSUFHbEMsSUFBSSxtQkFBbUI7QUFBQSxNQUN0QixJQUFJLGdCQUFnQixNQUFNLGlCQUFpQixpQkFBaUI7QUFBQSxNQUM1RCxXQUFXLEtBQUssR0FBRyxhQUFhO0FBQUE7QUFBQSxJQVdqQyxJQUFJLFdBUlUsTUFBTSxlQUFlO0FBQUEsTUFDbEMsS0FBSztBQUFBLE1BQ0wsT0FBTyxNQUFNLFFBQVEsSUFBSTtBQUFBLE1BQ3pCLEtBQUssT0FBTyxRQUFRLElBQUk7QUFBQSxNQUN4QixTQUFTO0FBQUEsTUFDVCxTQUFTO0FBQUEsSUFDVixDQUFDLEdBRXFCLElBQUksQ0FBQyxNQUFNLEtBQUssVUFBVSxDQUFDLENBQUMsRUFBRSxLQUFLO0FBQUEsQ0FBSTtBQUFBLElBQzFELGtCQUFjLGFBQWEsU0FBUyxFQUFFLFVBQVUsUUFBUSxDQUFDO0FBQUEsRUFDN0Q7QUFBQSxFQUdDLGtCQUFLLDBCQUEwQixHQUMvQixNQUFNLFlBQVksR0FBRztBQUFBLEVBR3RCO0FBQUEsSUFDQyxrQkFBSyx3QkFBd0I7QUFBQSxJQUU3QixJQUFJLFlBQTRCO0FBQUEsTUFDL0IsRUFBRSxNQUFNLEdBQUcscUJBQXFCLE1BQU0sU0FBUztBQUFBLE1BQy9DLEVBQUUsTUFBTSxHQUFHLHFCQUFxQixNQUFNLFNBQVM7QUFBQSxNQUMvQyxFQUFFLE1BQU0sR0FBRyx5QkFBeUIsTUFBTSxXQUFXO0FBQUEsTUFDckQsRUFBRSxNQUFNLEdBQUcsK0JBQStCLE1BQU0sZ0JBQWdCO0FBQUEsTUFDaEUsRUFBRSxNQUFNLEdBQUcsMEJBQTBCLE1BQU0sWUFBWTtBQUFBLElBQ3hEO0FBQUEsSUFFQSxNQUFNLGdCQUFnQixVQUFVLFdBQVcsR0FBRztBQUFBLEVBQy9DO0FBQUEsRUFFQSxrQkFBSywyQkFBMkIsV0FBVyxNQUFNLFFBQVEsQ0FBQyxJQUFJO0FBQUE7QUFHL0QsS0FBSzsiLAogICJkZWJ1Z0lkIjogIjhDNDM1OEIxNjM3MUJDRUE2NDc1NkUyMTY0NzU2RTIxIiwKICAibmFtZXMiOiBbXQp9
