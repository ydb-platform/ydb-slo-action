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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vaW5pdC9wb3N0LnRzIiwgIi4uL2luaXQvbGliL2FydGlmYWN0cy50cyIsICIuLi9pbml0L2xpYi9kb2NrZXIudHMiLCAiLi4vaW5pdC9saWIvbWV0cmljcy50cyIsICIuLi9pbml0L2xpYi9wcm9tZXRoZXVzLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWwogICAgImltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ25vZGU6cGF0aCdcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICdub2RlOnVybCdcblxuaW1wb3J0IHsgZGVidWcsIGdldElucHV0LCBnZXRTdGF0ZSwgaW5mbywgd2FybmluZyB9IGZyb20gJ0BhY3Rpb25zL2NvcmUnXG5cbmltcG9ydCB7IHVwbG9hZEFydGlmYWN0cywgdHlwZSBBcnRpZmFjdEZpbGUgfSBmcm9tICcuL2xpYi9hcnRpZmFjdHMuanMnXG5pbXBvcnQge1xuXHRjb2xsZWN0Q2hhb3NFdmVudHMsXG5cdGNvbGxlY3RDb21wb3NlTG9ncyxcblx0Y29sbGVjdERvY2tlckV2ZW50cyxcblx0Z2V0Q29udGFpbmVySXAsXG5cdHN0b3BDb21wb3NlLFxufSBmcm9tICcuL2xpYi9kb2NrZXIuanMnXG5pbXBvcnQgeyBjb2xsZWN0TWV0cmljcywgcGFyc2VNZXRyaWNzWWFtbCwgdHlwZSBNZXRyaWNEZWZpbml0aW9uIH0gZnJvbSAnLi9saWIvbWV0cmljcy5qcydcblxuYXN5bmMgZnVuY3Rpb24gcG9zdCgpIHtcblx0bGV0IGN3ZCA9IGdldFN0YXRlKCdjd2QnKVxuXHRsZXQgd29ya2xvYWQgPSBnZXRTdGF0ZSgnd29ya2xvYWQnKVxuXG5cdGxldCBzdGFydCA9IG5ldyBEYXRlKGdldFN0YXRlKCdzdGFydCcpKVxuXHRsZXQgZmluaXNoID0gbmV3IERhdGUoKVxuXHRsZXQgZHVyYXRpb24gPSBmaW5pc2guZ2V0VGltZSgpIC0gc3RhcnQuZ2V0VGltZSgpXG5cblx0bGV0IHB1bGxQYXRoID0gZ2V0U3RhdGUoJ3B1bGxfaW5mb19wYXRoJylcblx0bGV0IGxvZ3NQYXRoID0gcGF0aC5qb2luKGN3ZCwgYCR7d29ya2xvYWR9LWxvZ3MudHh0YClcblx0bGV0IGV2ZW50c1BhdGggPSBwYXRoLmpvaW4oY3dkLCBgJHt3b3JrbG9hZH0tZXZlbnRzLmpzb25sYClcblx0bGV0IGNoYW9zRXZlbnRzUGF0aCA9IHBhdGguam9pbihjd2QsIGAke3dvcmtsb2FkfS1jaGFvcy1ldmVudHMuanNvbmxgKVxuXHRsZXQgbWV0cmljc1BhdGggPSBwYXRoLmpvaW4oY3dkLCBgJHt3b3JrbG9hZH0tbWV0cmljcy5qc29ubGApXG5cblx0bGV0IHByb21ldGhldXNJcCA9IGF3YWl0IGdldENvbnRhaW5lcklwKCdwcm9tZXRoZXVzJywgY3dkKVxuXHRsZXQgcHJvbWV0aGV1c1VybCA9IHByb21ldGhldXNJcCA/IGBodHRwOi8vJHtwcm9tZXRoZXVzSXB9OjkwOTBgIDogJ2h0dHA6Ly9sb2NhbGhvc3Q6OTA5MCdcblx0ZGVidWcoYFByb21ldGhldXMgVVJMOiAke3Byb21ldGhldXNVcmx9YClcblxuXHRsZXQgYWN0aW9uUm9vdCA9IHBhdGgucmVzb2x2ZShwYXRoLmRpcm5hbWUoZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpKSwgJy4uLy4uLycpXG5cdGxldCBkZWZhdWx0TWV0cmljc1BhdGggPSBwYXRoLmpvaW4oYWN0aW9uUm9vdCwgJ2RlcGxveScsICdtZXRyaWNzLnlhbWwnKVxuXG5cdGxldCBtZXRyaWNzWWFtbCA9IGZzLnJlYWRGaWxlU3luYyhkZWZhdWx0TWV0cmljc1BhdGgsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSlcblx0bGV0IGN1c3RvbU1ldHJpY3NZYW1sID0gZ2V0SW5wdXQoJ21ldHJpY3NfeWFtbCcpXG5cblx0aWYgKGdldElucHV0KCdtZXRyaWNzX3lhbWxfcGF0aCcpKSB7XG5cdFx0bGV0IGN1c3RvbU1ldHJpY3NQYXRoID0gZ2V0SW5wdXQoJ21ldHJpY3NfeWFtbF9wYXRoJylcblx0XHRpZiAoIWZzLmV4aXN0c1N5bmMoY3VzdG9tTWV0cmljc1BhdGgpKSB7XG5cdFx0XHR3YXJuaW5nKGBDdXN0b20gbWV0cmljcyBmaWxlIG5vdCBmb3VuZDogJHtjdXN0b21NZXRyaWNzUGF0aH1gKVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRjdXN0b21NZXRyaWNzWWFtbCA9IGZzLnJlYWRGaWxlU3luYyhjdXN0b21NZXRyaWNzUGF0aCwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KVxuXHRcdH1cblx0fVxuXG5cdHtcblx0XHRpbmZvKCdDb2xsZWN0aW5nIGxvZ3MuLi4nKVxuXHRcdGxldCBsb2dzID0gYXdhaXQgY29sbGVjdENvbXBvc2VMb2dzKGN3ZClcblxuXHRcdGZzLndyaXRlRmlsZVN5bmMobG9nc1BhdGgsIGxvZ3MsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSlcblx0fVxuXG5cdHtcblx0XHRpbmZvKCdDb2xsZWN0aW5nIGRvY2tlciBldmVudHMuLi4nKVxuXHRcdGxldCBldmVudHMgPSBhd2FpdCBjb2xsZWN0RG9ja2VyRXZlbnRzKHtcblx0XHRcdGN3ZCxcblx0XHRcdHNpbmNlOiBzdGFydCxcblx0XHRcdHVudGlsOiBmaW5pc2gsXG5cdFx0fSlcblxuXHRcdGxldCBjb250ZW50ID0gZXZlbnRzLm1hcCgoZSkgPT4gSlNPTi5zdHJpbmdpZnkoZSkpLmpvaW4oJ1xcbicpXG5cdFx0ZnMud3JpdGVGaWxlU3luYyhldmVudHNQYXRoLCBjb250ZW50LCB7IGVuY29kaW5nOiAndXRmLTgnIH0pXG5cdH1cblxuXHR7XG5cdFx0aW5mbygnQ29sbGVjdGluZyBjaGFvcyBldmVudHMuLi4nKVxuXHRcdGxldCBjaGFvc0V2ZW50cyA9IGF3YWl0IGNvbGxlY3RDaGFvc0V2ZW50cyhjd2QpXG5cblx0XHRsZXQgY29udGVudCA9IGNoYW9zRXZlbnRzLm1hcCgoZSkgPT4gSlNPTi5zdHJpbmdpZnkoZSkpLmpvaW4oJ1xcbicpXG5cdFx0ZnMud3JpdGVGaWxlU3luYyhjaGFvc0V2ZW50c1BhdGgsIGNvbnRlbnQsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSlcblxuXHRcdGluZm8oYENvbGxlY3RlZCAke2NoYW9zRXZlbnRzLmxlbmd0aH0gY2hhb3MgZXZlbnRzYClcblx0fVxuXG5cdHtcblx0XHRpbmZvKCdDb2xsZWN0aW5nIG1ldHJpY3MuLi4nKVxuXG5cdFx0bGV0IG1ldHJpY3NEZWY6IE1ldHJpY0RlZmluaXRpb25bXSA9IFtdXG5cblx0XHRpZiAobWV0cmljc1lhbWwpIHtcblx0XHRcdGxldCBkZWZhdWx0TWV0cmljcyA9IGF3YWl0IHBhcnNlTWV0cmljc1lhbWwobWV0cmljc1lhbWwpXG5cdFx0XHRtZXRyaWNzRGVmLnB1c2goLi4uZGVmYXVsdE1ldHJpY3MpXG5cdFx0fVxuXG5cdFx0aWYgKGN1c3RvbU1ldHJpY3NZYW1sKSB7XG5cdFx0XHRsZXQgY3VzdG9tTWV0cmljcyA9IGF3YWl0IHBhcnNlTWV0cmljc1lhbWwoY3VzdG9tTWV0cmljc1lhbWwpXG5cdFx0XHRtZXRyaWNzRGVmLnB1c2goLi4uY3VzdG9tTWV0cmljcylcblx0XHR9XG5cblx0XHRsZXQgbWV0cmljcyA9IGF3YWl0IGNvbGxlY3RNZXRyaWNzKHtcblx0XHRcdHVybDogcHJvbWV0aGV1c1VybCxcblx0XHRcdHN0YXJ0OiBzdGFydC5nZXRUaW1lKCkgLyAxMDAwLFxuXHRcdFx0ZW5kOiBmaW5pc2guZ2V0VGltZSgpIC8gMTAwMCxcblx0XHRcdG1ldHJpY3M6IG1ldHJpY3NEZWYsXG5cdFx0XHR0aW1lb3V0OiAzMDAwMCxcblx0XHR9KVxuXG5cdFx0bGV0IGNvbnRlbnQgPSBtZXRyaWNzLm1hcCgobSkgPT4gSlNPTi5zdHJpbmdpZnkobSkpLmpvaW4oJ1xcbicpXG5cdFx0ZnMud3JpdGVGaWxlU3luYyhtZXRyaWNzUGF0aCwgY29udGVudCwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KVxuXHR9XG5cblx0e1xuXHRcdGluZm8oJ1N0b3BwaW5nIFlEQiBzZXJ2aWNlcy4uLicpXG5cdFx0YXdhaXQgc3RvcENvbXBvc2UoY3dkKVxuXHR9XG5cblx0e1xuXHRcdGluZm8oJ1VwbG9hZGluZyBhcnRpZmFjdHMuLi4nKVxuXG5cdFx0bGV0IGFydGlmYWN0czogQXJ0aWZhY3RGaWxlW10gPSBbXG5cdFx0XHR7IG5hbWU6IGAke3dvcmtsb2FkfS1wdWxsLnR4dGAsIHBhdGg6IHB1bGxQYXRoIH0sXG5cdFx0XHR7IG5hbWU6IGAke3dvcmtsb2FkfS1sb2dzLnR4dGAsIHBhdGg6IGxvZ3NQYXRoIH0sXG5cdFx0XHR7IG5hbWU6IGAke3dvcmtsb2FkfS1ldmVudHMuanNvbmxgLCBwYXRoOiBldmVudHNQYXRoIH0sXG5cdFx0XHR7IG5hbWU6IGAke3dvcmtsb2FkfS1jaGFvcy1ldmVudHMuanNvbmxgLCBwYXRoOiBjaGFvc0V2ZW50c1BhdGggfSxcblx0XHRcdHsgbmFtZTogYCR7d29ya2xvYWR9LW1ldHJpY3MuanNvbmxgLCBwYXRoOiBtZXRyaWNzUGF0aCB9LFxuXHRcdF1cblxuXHRcdGF3YWl0IHVwbG9hZEFydGlmYWN0cyh3b3JrbG9hZCwgYXJ0aWZhY3RzLCBjd2QpXG5cdH1cblxuXHRpbmZvKGBZREIgU0xPIFRlc3QgZHVyYXRpb246ICR7KGR1cmF0aW9uIC8gMTAwMCkudG9GaXhlZCgxKX1zYClcbn1cblxucG9zdCgpXG4iLAogICAgImltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMnXG5cbmltcG9ydCB7IERlZmF1bHRBcnRpZmFjdENsaWVudCB9IGZyb20gJ0BhY3Rpb25zL2FydGlmYWN0J1xuaW1wb3J0IHsgaW5mbywgd2FybmluZyB9IGZyb20gJ0BhY3Rpb25zL2NvcmUnXG5cbmV4cG9ydCBpbnRlcmZhY2UgQXJ0aWZhY3RGaWxlIHtcblx0bmFtZTogc3RyaW5nXG5cdHBhdGg6IHN0cmluZ1xufVxuXG4vKipcbiAqIFVwbG9hZHMgYXJ0aWZhY3RzIHRvIEdpdEh1YiBBY3Rpb25zIGFzIGEgc2luZ2xlIGJ1bmRsZVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBsb2FkQXJ0aWZhY3RzKG5hbWU6IHN0cmluZywgYXJ0aWZhY3RzOiBBcnRpZmFjdEZpbGVbXSwgY3dkPzogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG5cdGxldCBhcnRpZmFjdENsaWVudCA9IG5ldyBEZWZhdWx0QXJ0aWZhY3RDbGllbnQoKVxuXHRsZXQgcm9vdERpcmVjdG9yeSA9IGN3ZCB8fCBwcm9jZXNzLmN3ZCgpXG5cblx0bGV0IGZpbGVzOiBzdHJpbmdbXSA9IFtdXG5cblx0Zm9yIChsZXQgYXJ0aWZhY3Qgb2YgYXJ0aWZhY3RzKSB7XG5cdFx0aWYgKCFmcy5leGlzdHNTeW5jKGFydGlmYWN0LnBhdGgpKSB7XG5cdFx0XHR3YXJuaW5nKGBBcnRpZmFjdCBzb3VyY2UgbWlzc2luZzogJHthcnRpZmFjdC5wYXRofWApXG5cdFx0XHRjb250aW51ZVxuXHRcdH1cblx0XHRmaWxlcy5wdXNoKGFydGlmYWN0LnBhdGgpXG5cdH1cblxuXHRpZiAoZmlsZXMubGVuZ3RoID09PSAwKSB7XG5cdFx0d2FybmluZygnTm8gYXJ0aWZhY3RzIHRvIHVwbG9hZCcpXG5cdFx0cmV0dXJuXG5cdH1cblxuXHR0cnkge1xuXHRcdC8vIEtlZXAgYXJ0aWZhY3RzIGZvciAxIGRheSBvbmx5IHRvIHNhdmUgc3RvcmFnZSBzcGFjZVxuXHRcdGxldCB7IGlkIH0gPSBhd2FpdCBhcnRpZmFjdENsaWVudC51cGxvYWRBcnRpZmFjdChuYW1lLCBmaWxlcywgcm9vdERpcmVjdG9yeSwge1xuXHRcdFx0cmV0ZW50aW9uRGF5czogMSxcblx0XHR9KVxuXG5cdFx0aW5mbyhgVXBsb2FkZWQgJHtmaWxlcy5sZW5ndGh9IGZpbGUocykgYXMgYXJ0aWZhY3QgJHtuYW1lfSAoaWQ6ICR7aWR9KWApXG5cdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0d2FybmluZyhgRmFpbGVkIHRvIHVwbG9hZCBhcnRpZmFjdHM6ICR7U3RyaW5nKGVycm9yKX1gKVxuXHR9XG59XG4iLAogICAgImltcG9ydCB7IHdhcm5pbmcgfSBmcm9tICdAYWN0aW9ucy9jb3JlJ1xuaW1wb3J0IHsgZXhlYyB9IGZyb20gJ0BhY3Rpb25zL2V4ZWMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgRG9ja2VyRXZlbnQge1xuXHRzdGF0dXM6IHN0cmluZ1xuXHRpZDogc3RyaW5nXG5cdGZyb206IHN0cmluZ1xuXHRUeXBlOiBzdHJpbmdcblx0QWN0aW9uOiBzdHJpbmdcblx0QWN0b3I6IHtcblx0XHRJRDogc3RyaW5nXG5cdFx0QXR0cmlidXRlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuXHR9XG5cdHNjb3BlOiBzdHJpbmdcblx0dGltZTogbnVtYmVyXG5cdHRpbWVOYW5vOiBudW1iZXJcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDaGFvc0V2ZW50IHtcblx0dGltZXN0YW1wOiBzdHJpbmdcblx0ZXBvY2hfbXM6IG51bWJlclxuXHRzY2VuYXJpbzogc3RyaW5nXG5cdGFjdGlvbjogc3RyaW5nXG5cdHRhcmdldDogc3RyaW5nXG5cdHNldmVyaXR5OiAnaW5mbycgfCAnd2FybmluZycgfCAnY3JpdGljYWwnXG5cdG1ldGFkYXRhOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPlxufVxuXG4vKipcbiAqIEdldHMgSVAgYWRkcmVzcyBvZiBhIERvY2tlciBjb250YWluZXJcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldENvbnRhaW5lcklwKGNvbnRhaW5lck5hbWU6IHN0cmluZywgY3dkOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcblx0dHJ5IHtcblx0XHRsZXQgY2h1bmtzOiBzdHJpbmdbXSA9IFtdXG5cblx0XHRhd2FpdCBleGVjKFxuXHRcdFx0J2RvY2tlcicsXG5cdFx0XHRbJ2luc3BlY3QnLCAnLWYnLCAne3tyYW5nZSAuTmV0d29ya1NldHRpbmdzLk5ldHdvcmtzfX17ey5JUEFkZHJlc3N9fXt7ZW5kfX0nLCBjb250YWluZXJOYW1lXSxcblx0XHRcdHtcblx0XHRcdFx0Y3dkLFxuXHRcdFx0XHRzaWxlbnQ6IHRydWUsXG5cdFx0XHRcdGxpc3RlbmVyczoge1xuXHRcdFx0XHRcdHN0ZG91dDogKGRhdGEpID0+IGNodW5rcy5wdXNoKGRhdGEudG9TdHJpbmcoKSksXG5cdFx0XHRcdH0sXG5cdFx0XHR9XG5cdFx0KVxuXG5cdFx0bGV0IGlwID0gY2h1bmtzLmpvaW4oJycpLnRyaW0oKVxuXHRcdHJldHVybiBpcCB8fCBudWxsXG5cdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0d2FybmluZyhgRmFpbGVkIHRvIGdldCBjb250YWluZXIgSVAgZm9yICR7Y29udGFpbmVyTmFtZX06ICR7U3RyaW5nKGVycm9yKX1gKVxuXHRcdHJldHVybiBudWxsXG5cdH1cbn1cblxuLyoqXG4gKiBDb2xsZWN0cyBsb2dzIGZyb20gRG9ja2VyIENvbXBvc2Ugc2VydmljZXNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvbGxlY3RDb21wb3NlTG9ncyhjd2Q6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG5cdHRyeSB7XG5cdFx0bGV0IGNodW5rczogc3RyaW5nW10gPSBbXVxuXG5cdFx0YXdhaXQgZXhlYyhgZG9ja2VyYCwgW2Bjb21wb3NlYCwgYC1mYCwgYGNvbXBvc2UueW1sYCwgYGxvZ3NgLCBgLS1uby1jb2xvcmBdLCB7XG5cdFx0XHRjd2QsXG5cdFx0XHRzaWxlbnQ6IHRydWUsXG5cdFx0XHRsaXN0ZW5lcnM6IHtcblx0XHRcdFx0c3Rkb3V0OiAoZGF0YSkgPT4gY2h1bmtzLnB1c2goZGF0YS50b1N0cmluZygpKSxcblx0XHRcdFx0c3RkZXJyOiAoZGF0YSkgPT4gY2h1bmtzLnB1c2goZGF0YS50b1N0cmluZygpKSxcblx0XHRcdH0sXG5cdFx0fSlcblxuXHRcdHJldHVybiBjaHVua3Muam9pbignJylcblx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHR3YXJuaW5nKGBGYWlsZWQgdG8gY29sbGVjdCBkb2NrZXIgY29tcG9zZSBsb2dzOiAke1N0cmluZyhlcnJvcil9YClcblx0XHRyZXR1cm4gJydcblx0fVxufVxuXG4vKipcbiAqIENvbGxlY3RzIERvY2tlciBldmVudHMgZm9yIFlEQiBkYXRhYmFzZSBub2Rlc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY29sbGVjdERvY2tlckV2ZW50cyhvcHRpb25zOiB7IGN3ZDogc3RyaW5nOyBzaW5jZTogRGF0ZTsgdW50aWw6IERhdGUgfSk6IFByb21pc2U8RG9ja2VyRXZlbnRbXT4ge1xuXHRsZXQgZXZlbnRzOiBEb2NrZXJFdmVudFtdID0gW11cblxuXHR0cnkge1xuXHRcdGxldCBjaHVua3M6IHN0cmluZ1tdID0gW11cblxuXHRcdC8vIHByZXR0aWVyLWlnbm9yZVxuXHRcdGF3YWl0IGV4ZWMoXG5cdFx0XHRgZG9ja2VyYCxcblx0XHRcdFtcblx0XHRcdFx0YGV2ZW50c2AsXG5cdFx0XHRcdGAtLWZpbHRlcmAsIGB0eXBlPWNvbnRhaW5lcmAsXG5cdFx0XHRcdGAtLWZpbHRlcmAsIGBsYWJlbD15ZGIubm9kZS50eXBlPWRhdGFiYXNlYCxcblx0XHRcdFx0YC0tZmlsdGVyYCwgYGxhYmVsPXlkYi5ub2RlLnR5cGU9c3RvcmFnZWAsXG5cdFx0XHRcdGAtLXNpbmNlYCwgb3B0aW9ucy5zaW5jZS50b0lTT1N0cmluZygpLFxuXHRcdFx0XHRgLS11bnRpbGAsXG5cdFx0XHRcdG9wdGlvbnMudW50aWwudG9JU09TdHJpbmcoKSxcblx0XHRcdFx0YC0tZm9ybWF0YCxcblx0XHRcdFx0YHt7anNvbiAufX1gLFxuXHRcdFx0XSxcblx0XHRcdHtcblx0XHRcdFx0Y3dkOiBvcHRpb25zLmN3ZCxcblx0XHRcdFx0c2lsZW50OiB0cnVlLFxuXHRcdFx0XHRsaXN0ZW5lcnM6IHtcblx0XHRcdFx0XHRzdGRvdXQ6IChkYXRhKSA9PiBjaHVua3MucHVzaChkYXRhLnRvU3RyaW5nKCkpLFxuXHRcdFx0XHR9LFxuXHRcdFx0fVxuXHRcdClcblxuXHRcdGxldCBsaW5lcyA9IGNodW5rcy5qb2luKCcnKS5zcGxpdCgnXFxuJykuZmlsdGVyKEJvb2xlYW4pXG5cdFx0Zm9yIChsZXQgbGluZSBvZiBsaW5lcykge1xuXHRcdFx0ZXZlbnRzLnB1c2goSlNPTi5wYXJzZShsaW5lKSBhcyBEb2NrZXJFdmVudClcblx0XHR9XG5cdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0d2FybmluZyhgRmFpbGVkIHRvIGNvbGxlY3QgRG9ja2VyIGV2ZW50czogJHtTdHJpbmcoZXJyb3IpfWApXG5cdH1cblxuXHRyZXR1cm4gZXZlbnRzXG59XG5cbi8qKlxuICogQ29sbGVjdHMgY2hhb3MgZXZlbnRzIGZyb20gY2hhb3MtbW9ua2V5IGNvbnRhaW5lclxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY29sbGVjdENoYW9zRXZlbnRzKGN3ZDogc3RyaW5nKTogUHJvbWlzZTxDaGFvc0V2ZW50W10+IHtcblx0bGV0IGV2ZW50czogQ2hhb3NFdmVudFtdID0gW11cblxuXHR0cnkge1xuXHRcdGxldCBjaHVua3M6IHN0cmluZ1tdID0gW11cblxuXHRcdC8vIENvcHkgZXZlbnRzIGZpbGUgZnJvbSBjaGFvcy1tb25rZXkgY29udGFpbmVyIHZvbHVtZVxuXHRcdC8vIFRoZSBmaWxlIGlzIGluIGEgbmFtZWQgdm9sdW1lLCBzbyB3ZSBjb3B5IGl0IGZyb20gdGhlIGNvbnRhaW5lclxuXHRcdGF3YWl0IGV4ZWMoYGRvY2tlcmAsIFtgY3BgLCBgeWRiLWNoYW9zLW1vbmtleTovdmFyL2xvZy9jaGFvcy1ldmVudHMuanNvbmxgLCBgLWBdLCB7XG5cdFx0XHRjd2QsXG5cdFx0XHRzaWxlbnQ6IHRydWUsXG5cdFx0XHRpZ25vcmVSZXR1cm5Db2RlOiB0cnVlLCAvLyBGaWxlIG1pZ2h0IG5vdCBleGlzdCBpZiBjaGFvcy1tb25rZXkgaGFzbid0IHJ1biB5ZXRcblx0XHRcdGxpc3RlbmVyczoge1xuXHRcdFx0XHRzdGRvdXQ6IChkYXRhKSA9PiBjaHVua3MucHVzaChkYXRhLnRvU3RyaW5nKCkpLFxuXHRcdFx0fSxcblx0XHR9KVxuXG5cdFx0bGV0IGNvbnRlbnQgPSBjaHVua3Muam9pbignJylcblx0XHRpZiAoY29udGVudCkge1xuXHRcdFx0bGV0IGxpbmVzID0gY29udGVudC5zcGxpdCgnXFxuJykuZmlsdGVyKEJvb2xlYW4pXG5cdFx0XHRmb3IgKGxldCBsaW5lIG9mIGxpbmVzKSB7XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0ZXZlbnRzLnB1c2goSlNPTi5wYXJzZShsaW5lKSBhcyBDaGFvc0V2ZW50KVxuXHRcdFx0XHR9IGNhdGNoIHtcblx0XHRcdFx0XHQvLyBTa2lwIGludmFsaWQgSlNPTiBsaW5lc1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9IGNhdGNoIChlcnJvcikge1xuXHRcdHdhcm5pbmcoYEZhaWxlZCB0byBjb2xsZWN0IGNoYW9zIGV2ZW50czogJHtTdHJpbmcoZXJyb3IpfWApXG5cdH1cblxuXHRyZXR1cm4gZXZlbnRzXG59XG5cbi8qKlxuICogU3RvcHMgRG9ja2VyIENvbXBvc2UgcHJvamVjdFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3RvcENvbXBvc2UoY3dkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcblx0YXdhaXQgZXhlYyhgZG9ja2VyYCwgW2Bjb21wb3NlYCwgYC1mYCwgYGNvbXBvc2UueW1sYCwgYGRvd25gXSwgeyBjd2QgfSlcbn1cbiIsCiAgICAiaW1wb3J0IHsgZXhlYyB9IGZyb20gJ0BhY3Rpb25zL2V4ZWMnXG5cbmltcG9ydCB7IHF1ZXJ5SW5zdGFudCwgcXVlcnlSYW5nZSwgdHlwZSBQcm9tZXRoZXVzSW5zdGFudFZhbHVlLCB0eXBlIFByb21ldGhldXNSYW5nZVZhbHVlIH0gZnJvbSAnLi9wcm9tZXRoZXVzLmpzJ1xuXG5leHBvcnQgaW50ZXJmYWNlIE1ldHJpY0RlZmluaXRpb24ge1xuXHRuYW1lOiBzdHJpbmdcblx0cXVlcnk6IHN0cmluZ1xuXHR0eXBlPzogJ3JhbmdlJyB8ICdpbnN0YW50J1xuXHRzdGVwPzogc3RyaW5nXG5cdHRpbWU/OiBudW1iZXJcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb2xsZWN0ZWRNZXRyaWMge1xuXHRuYW1lOiBzdHJpbmdcblx0cXVlcnk6IHN0cmluZ1xuXHR0eXBlOiAncmFuZ2UnIHwgJ2luc3RhbnQnXG5cdGRhdGE6IFByb21ldGhldXNSYW5nZVZhbHVlW10gfCBQcm9tZXRoZXVzSW5zdGFudFZhbHVlW11cbn1cblxuLyoqXG4gKiBTdXBwb3J0cyB0d28gWUFNTCBmb3JtYXRzIGZvciBmbGV4aWJpbGl0eTpcbiAqIC0gQXJyYXkgYXQgcm9vdDogW3sgbmFtZTogLi4uLCBxdWVyeTogLi4uIH1dXG4gKiAtIE9iamVjdCB3aXRoIG1ldHJpY3MgZmllbGQ6IHsgbWV0cmljczogW3sgbmFtZTogLi4uLCBxdWVyeTogLi4uIH1dIH1cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHBhcnNlTWV0cmljc1lhbWwoeWFtbENvbnRlbnQ6IHN0cmluZyk6IFByb21pc2U8TWV0cmljRGVmaW5pdGlvbltdPiB7XG5cdGlmICgheWFtbENvbnRlbnQgfHwgeWFtbENvbnRlbnQudHJpbSgpID09PSAnJykge1xuXHRcdHJldHVybiBbXVxuXHR9XG5cblx0dHJ5IHtcblx0XHRsZXQgY2h1bmtzOiBzdHJpbmdbXSA9IFtdXG5cblx0XHRhd2FpdCBleGVjKCd5cScsIFsnLW89anNvbicsICcuJ10sIHtcblx0XHRcdGlucHV0OiBCdWZmZXIuZnJvbSh5YW1sQ29udGVudCwgJ3V0Zi04JyksXG5cdFx0XHRzaWxlbnQ6IHRydWUsXG5cdFx0XHRsaXN0ZW5lcnM6IHtcblx0XHRcdFx0c3Rkb3V0OiAoZGF0YSkgPT4gY2h1bmtzLnB1c2goZGF0YS50b1N0cmluZygpKSxcblx0XHRcdH0sXG5cdFx0fSlcblxuXHRcdGxldCBqc29uID0gY2h1bmtzLmpvaW4oJycpXG5cdFx0bGV0IHBhcnNlZCA9IEpTT04ucGFyc2UoanNvbilcblxuXHRcdGlmIChBcnJheS5pc0FycmF5KHBhcnNlZCkpIHtcblx0XHRcdHJldHVybiBwYXJzZWRcblx0XHR9XG5cblx0XHRyZXR1cm4gW11cblx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBwYXJzZSBtZXRyaWNzIFlBTUw6ICR7U3RyaW5nKGVycm9yKX1gKVxuXHR9XG59XG5cbi8qKlxuICogQ2FsY3VsYXRlcyBvcHRpbWFsIHN0ZXAgdG8gZ2V0IH4yMDAgZGF0YSBwb2ludHMgcmVnYXJkbGVzcyBvZiB0ZXN0IGR1cmF0aW9uLlxuICogVGhpcyBwcm92aWRlcyBnb29kIGNoYXJ0IHJlc29sdXRpb24gd2l0aG91dCBvdmVybG9hZGluZyBQcm9tZXRoZXVzLlxuICovXG5mdW5jdGlvbiBjYWxjdWxhdGVPcHRpbWFsU3RlcChkdXJhdGlvblNlY29uZHM6IG51bWJlcik6IHN0cmluZyB7XG5cdGxldCB0YXJnZXRQb2ludHMgPSAyMDBcblx0bGV0IHN0ZXBTZWNvbmRzID0gTWF0aC5jZWlsKGR1cmF0aW9uU2Vjb25kcyAvIHRhcmdldFBvaW50cylcblxuXHRzdGVwU2Vjb25kcyA9IE1hdGgubWF4KDUsIE1hdGgubWluKDYwLCBzdGVwU2Vjb25kcykpXG5cblx0Ly8gUm91bmQgdG8gY29tbW9uIGludGVydmFscyBmb3IgYmV0dGVyIGFsaWdubWVudCB3aXRoIHNjcmFwZSBpbnRlcnZhbHNcblx0bGV0IG5pY2VTdGVwcyA9IFs1LCAxMCwgMTUsIDMwLCA2MF1cblx0Zm9yIChsZXQgbmljZVN0ZXAgb2YgbmljZVN0ZXBzKSB7XG5cdFx0aWYgKHN0ZXBTZWNvbmRzIDw9IG5pY2VTdGVwKSB7XG5cdFx0XHRyZXR1cm4gYCR7bmljZVN0ZXB9c2Bcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gJzYwcydcbn1cblxuLyoqXG4gKiBDb2xsZWN0cyBtZXRyaWNzIGZyb20gUHJvbWV0aGV1cyB1c2luZyBwcm92aWRlZCBtZXRyaWMgZGVmaW5pdGlvbnNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvbGxlY3RNZXRyaWNzKG9wdGlvbnM6IHtcblx0dXJsOiBzdHJpbmdcblx0c3RhcnQ6IG51bWJlclxuXHRlbmQ6IG51bWJlclxuXHRtZXRyaWNzOiBNZXRyaWNEZWZpbml0aW9uW11cblx0dGltZW91dDogbnVtYmVyXG59KTogUHJvbWlzZTxDb2xsZWN0ZWRNZXRyaWNbXT4ge1xuXHRsZXQgcmVzdWx0czogQ29sbGVjdGVkTWV0cmljW10gPSBbXVxuXG5cdGxldCBkdXJhdGlvblNlY29uZHMgPSBvcHRpb25zLmVuZCAtIG9wdGlvbnMuc3RhcnRcblx0bGV0IGRlZmF1bHRTdGVwID0gY2FsY3VsYXRlT3B0aW1hbFN0ZXAoZHVyYXRpb25TZWNvbmRzKVxuXG5cdGZvciAobGV0IG1ldHJpYyBvZiBvcHRpb25zLm1ldHJpY3MpIHtcblx0XHR0cnkge1xuXHRcdFx0bGV0IHR5cGUgPSBtZXRyaWMudHlwZSB8fCAncmFuZ2UnXG5cblx0XHRcdGlmICh0eXBlID09PSAnaW5zdGFudCcpIHtcblx0XHRcdFx0bGV0IHJlc3BvbnNlID0gYXdhaXQgcXVlcnlJbnN0YW50KHtcblx0XHRcdFx0XHR1cmw6IG9wdGlvbnMudXJsLFxuXHRcdFx0XHRcdHF1ZXJ5OiBtZXRyaWMucXVlcnksXG5cdFx0XHRcdFx0dGltZTogbWV0cmljLnRpbWUgfHwgb3B0aW9ucy5lbmQsXG5cdFx0XHRcdFx0dGltZW91dDogb3B0aW9ucy50aW1lb3V0LFxuXHRcdFx0XHR9KVxuXG5cdFx0XHRcdGlmIChyZXNwb25zZS5zdGF0dXMgPT09ICdzdWNjZXNzJyAmJiByZXNwb25zZS5kYXRhKSB7XG5cdFx0XHRcdFx0cmVzdWx0cy5wdXNoKHtcblx0XHRcdFx0XHRcdG5hbWU6IG1ldHJpYy5uYW1lLFxuXHRcdFx0XHRcdFx0cXVlcnk6IG1ldHJpYy5xdWVyeSxcblx0XHRcdFx0XHRcdHR5cGU6ICdpbnN0YW50Jyxcblx0XHRcdFx0XHRcdGRhdGE6IHJlc3BvbnNlLmRhdGEucmVzdWx0LFxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGxldCByZXNwb25zZSA9IGF3YWl0IHF1ZXJ5UmFuZ2Uoe1xuXHRcdFx0XHRcdHVybDogb3B0aW9ucy51cmwsXG5cdFx0XHRcdFx0cXVlcnk6IG1ldHJpYy5xdWVyeSxcblx0XHRcdFx0XHRzdGFydDogb3B0aW9ucy5zdGFydCxcblx0XHRcdFx0XHRlbmQ6IG9wdGlvbnMuZW5kLFxuXHRcdFx0XHRcdHN0ZXA6IG1ldHJpYy5zdGVwIHx8IGRlZmF1bHRTdGVwLFxuXHRcdFx0XHRcdHRpbWVvdXQ6IG9wdGlvbnMudGltZW91dCxcblx0XHRcdFx0fSlcblxuXHRcdFx0XHRpZiAocmVzcG9uc2Uuc3RhdHVzID09PSAnc3VjY2VzcycgJiYgcmVzcG9uc2UuZGF0YSkge1xuXHRcdFx0XHRcdHJlc3VsdHMucHVzaCh7XG5cdFx0XHRcdFx0XHRuYW1lOiBtZXRyaWMubmFtZSxcblx0XHRcdFx0XHRcdHF1ZXJ5OiBtZXRyaWMucXVlcnksXG5cdFx0XHRcdFx0XHR0eXBlOiAncmFuZ2UnLFxuXHRcdFx0XHRcdFx0ZGF0YTogcmVzcG9uc2UuZGF0YS5yZXN1bHQsXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0gY2F0Y2gge1xuXHRcdFx0Y29udGludWVcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gcmVzdWx0c1xufVxuIiwKICAgICJleHBvcnQgdHlwZSBQcm9tZXRoZXVzVmFsdWVUeXBlID0gJ21hdHJpeCcgfCAndmVjdG9yJyB8ICdzY2FsYXInIHwgJ3N0cmluZydcblxuZXhwb3J0IGludGVyZmFjZSBQcm9tZXRoZXVzTWV0cmljIHtcblx0W2xhYmVsOiBzdHJpbmddOiBzdHJpbmdcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQcm9tZXRoZXVzSW5zdGFudFZhbHVlIHtcblx0bWV0cmljOiBQcm9tZXRoZXVzTWV0cmljXG5cdHZhbHVlOiBbbnVtYmVyLCBzdHJpbmddXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJvbWV0aGV1c1JhbmdlVmFsdWUge1xuXHRtZXRyaWM6IFByb21ldGhldXNNZXRyaWNcblx0dmFsdWVzOiBBcnJheTxbbnVtYmVyLCBzdHJpbmddPlxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFByb21ldGhldXNTY2FsYXJWYWx1ZSB7XG5cdHZhbHVlOiBbbnVtYmVyLCBzdHJpbmddXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJvbWV0aGV1c1Jlc3BvbnNlPFQgPSBQcm9tZXRoZXVzSW5zdGFudFZhbHVlIHwgUHJvbWV0aGV1c1JhbmdlVmFsdWU+IHtcblx0c3RhdHVzOiAnc3VjY2VzcycgfCAnZXJyb3InXG5cdGRhdGE/OiB7XG5cdFx0cmVzdWx0VHlwZTogUHJvbWV0aGV1c1ZhbHVlVHlwZVxuXHRcdHJlc3VsdDogVFtdXG5cdH1cblx0ZXJyb3JUeXBlPzogc3RyaW5nXG5cdGVycm9yPzogc3RyaW5nXG5cdHdhcm5pbmdzPzogc3RyaW5nW11cbn1cblxuZXhwb3J0IGludGVyZmFjZSBQcm9tZXRoZXVzUXVlcnlPcHRpb25zIHtcblx0dXJsPzogc3RyaW5nXG5cdHRpbWVvdXQ/OiBudW1iZXJcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQcm9tZXRoZXVzSW5zdGFudFF1ZXJ5UGFyYW1zIGV4dGVuZHMgUHJvbWV0aGV1c1F1ZXJ5T3B0aW9ucyB7XG5cdHF1ZXJ5OiBzdHJpbmdcblx0dGltZT86IHN0cmluZyB8IG51bWJlclxuXHRxdWVyeVRpbWVvdXQ/OiBzdHJpbmdcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQcm9tZXRoZXVzUmFuZ2VRdWVyeVBhcmFtcyBleHRlbmRzIFByb21ldGhldXNRdWVyeU9wdGlvbnMge1xuXHRxdWVyeTogc3RyaW5nXG5cdHN0YXJ0OiBzdHJpbmcgfCBudW1iZXJcblx0ZW5kOiBzdHJpbmcgfCBudW1iZXJcblx0c3RlcDogc3RyaW5nXG5cdHF1ZXJ5VGltZW91dD86IHN0cmluZ1xufVxuXG4vKipcbiAqIEV4ZWN1dGVzIGluc3RhbnQgUHJvbVFMIHF1ZXJ5IGF0IGEgc3BlY2lmaWMgcG9pbnQgaW4gdGltZVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcXVlcnlJbnN0YW50KFxuXHRwYXJhbXM6IFByb21ldGhldXNJbnN0YW50UXVlcnlQYXJhbXNcbik6IFByb21pc2U8UHJvbWV0aGV1c1Jlc3BvbnNlPFByb21ldGhldXNJbnN0YW50VmFsdWU+PiB7XG5cdGxldCBiYXNlVXJsID0gcGFyYW1zLnVybCB8fCAnaHR0cDovL2xvY2FsaG9zdDo5MDkwJ1xuXHRsZXQgdGltZW91dCA9IHBhcmFtcy50aW1lb3V0IHx8IDMwMDAwXG5cblx0bGV0IHVybCA9IG5ldyBVUkwoJy9hcGkvdjEvcXVlcnknLCBiYXNlVXJsKVxuXHR1cmwuc2VhcmNoUGFyYW1zLnNldCgncXVlcnknLCBwYXJhbXMucXVlcnkpXG5cblx0aWYgKHBhcmFtcy50aW1lICE9PSB1bmRlZmluZWQpIHtcblx0XHR1cmwuc2VhcmNoUGFyYW1zLnNldCgndGltZScsIHBhcmFtcy50aW1lLnRvU3RyaW5nKCkpXG5cdH1cblxuXHRpZiAocGFyYW1zLnF1ZXJ5VGltZW91dCkge1xuXHRcdHVybC5zZWFyY2hQYXJhbXMuc2V0KCd0aW1lb3V0JywgcGFyYW1zLnF1ZXJ5VGltZW91dClcblx0fVxuXG5cdGxldCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybC50b1N0cmluZygpLCB7XG5cdFx0c2lnbmFsOiBBYm9ydFNpZ25hbC50aW1lb3V0KHRpbWVvdXQpLFxuXHR9KVxuXG5cdGxldCBkYXRhID0gKGF3YWl0IHJlc3BvbnNlLmpzb24oKSkgYXMgUHJvbWV0aGV1c1Jlc3BvbnNlPFByb21ldGhldXNJbnN0YW50VmFsdWU+XG5cblx0aWYgKCFyZXNwb25zZS5vaykge1xuXHRcdHRocm93IG5ldyBFcnJvcihgUHJvbWV0aGV1cyBxdWVyeSBmYWlsZWQ6ICR7ZGF0YS5lcnJvciB8fCByZXNwb25zZS5zdGF0dXNUZXh0fWApXG5cdH1cblxuXHRyZXR1cm4gZGF0YVxufVxuXG4vKipcbiAqIEV4ZWN1dGVzIFByb21RTCByYW5nZSBxdWVyeSBvdmVyIGEgdGltZSBwZXJpb2RcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHF1ZXJ5UmFuZ2UoXG5cdHBhcmFtczogUHJvbWV0aGV1c1JhbmdlUXVlcnlQYXJhbXNcbik6IFByb21pc2U8UHJvbWV0aGV1c1Jlc3BvbnNlPFByb21ldGhldXNSYW5nZVZhbHVlPj4ge1xuXHRsZXQgYmFzZVVybCA9IHBhcmFtcy51cmwgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6OTA5MCdcblx0bGV0IHRpbWVvdXQgPSBwYXJhbXMudGltZW91dCB8fCAzMDAwMFxuXG5cdGxldCB1cmwgPSBuZXcgVVJMKCcvYXBpL3YxL3F1ZXJ5X3JhbmdlJywgYmFzZVVybClcblx0dXJsLnNlYXJjaFBhcmFtcy5zZXQoJ3F1ZXJ5JywgcGFyYW1zLnF1ZXJ5KVxuXHR1cmwuc2VhcmNoUGFyYW1zLnNldCgnc3RhcnQnLCBwYXJhbXMuc3RhcnQudG9TdHJpbmcoKSlcblx0dXJsLnNlYXJjaFBhcmFtcy5zZXQoJ2VuZCcsIHBhcmFtcy5lbmQudG9TdHJpbmcoKSlcblx0dXJsLnNlYXJjaFBhcmFtcy5zZXQoJ3N0ZXAnLCBwYXJhbXMuc3RlcClcblxuXHRpZiAocGFyYW1zLnF1ZXJ5VGltZW91dCkge1xuXHRcdHVybC5zZWFyY2hQYXJhbXMuc2V0KCd0aW1lb3V0JywgcGFyYW1zLnF1ZXJ5VGltZW91dClcblx0fVxuXG5cdGxldCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybC50b1N0cmluZygpLCB7XG5cdFx0c2lnbmFsOiBBYm9ydFNpZ25hbC50aW1lb3V0KHRpbWVvdXQpLFxuXHR9KVxuXG5cdGxldCBkYXRhID0gKGF3YWl0IHJlc3BvbnNlLmpzb24oKSkgYXMgUHJvbWV0aGV1c1Jlc3BvbnNlPFByb21ldGhldXNSYW5nZVZhbHVlPlxuXG5cdGlmICghcmVzcG9uc2Uub2spIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYFByb21ldGhldXMgcmFuZ2UgcXVlcnkgZmFpbGVkOiAke2RhdGEuZXJyb3IgfHwgcmVzcG9uc2Uuc3RhdHVzVGV4dH1gKVxuXHR9XG5cblx0cmV0dXJuIGRhdGFcbn1cbiIKICBdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7OztBQUlBO0FBSkE7QUFDQTtBQUNBOzs7QUNBQSxzREFDQTtBQUhBO0FBYUEsZUFBc0IsZUFBZSxDQUFDLE1BQWMsV0FBMkIsS0FBNkI7QUFBQSxFQUMzRyxJQUFJLGlCQUFpQixJQUFJLHVDQUNyQixnQkFBZ0IsT0FBTyxRQUFRLElB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QzdEO0FBQUEsRUFHQyxrQkFBSywwQkFBMEIsR0FDL0IsTUFBTSxZQUFZLEdBQUc7QUFBQSxFQUd0QjtBQUFBLElBQ0Msa0JBQUssd0JBQXdCO0FBQUEsSUFFN0IsSUFBSSxZQUE0QjtBQUFBLE1BQy9CLEVBQUUsTUFBTSxHQUFHLHFCQUFxQixNQUFNLFNBQVM7QUFBQSxNQUMvQyxFQUFFLE1BQU0sR0FBRyxxQkFBcUIsTUFBTSxTQUFTO0FBQUEsTUFDL0MsRUFBRSxNQUFNLEdBQUcseUJBQXlCLE1BQU0sV0FBVztBQUFBLE1BQ3JELEVBQUUsTUFBTSxHQUFHLCtCQUErQixNQUFNLGdCQUFnQjtBQUFBLE1BQ2hFLEVBQUUsTUFBTSxHQUFHLDBCQUEwQixNQUFNLFlBQVk7QUFBQSxJQUN4RDtBQUFBLElBRUEsTUFBTSxnQkFBZ0IsVUFBVSxXQUFXLEdBQUc7QUFBQSxFQUMvQztBQUFBLEVBRUEsa0JBQUssMkJBQTJCLFdBQVcsTUFBTSxRQUFRLENBQUMsSUFBSTtBQUFBO0FBRy9ELEtBQUs7IiwKICAiZGVidWdJZCI6ICI4QzQzNThCMTYzNzFCQ0VBNjQ3NTZFMjE2NDc1NkUyMSIsCiAgIm5hbWVzIjogW10KfQ==
