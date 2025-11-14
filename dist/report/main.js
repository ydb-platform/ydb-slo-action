import {
  require_github
} from "../main-5sw3hmtr.js";
import {
  require_artifact,
  require_core
} from "../main-7765bw5h.js";
import {
  __toESM
} from "../main-ynsbc1hx.js";

// report/main.ts
var import_artifact = __toESM(require_artifact(), 1), import_core = __toESM(require_core(), 1), import_github2 = __toESM(require_github(), 1);
import * as fs from "node:fs";
import * as path from "node:path";

// report/colors.ts
var palette = [
  "#FF7F0E",
  "#1F77B4",
  "#D62728",
  "#2CA02C",
  "#9467BD",
  "#8C564B",
  "#E377C2",
  "#7F7F7F",
  "#BCBD22",
  "#17BECF"
];

// report/chart.ts
function renderChart(title, series, xLabel = "", yLabel = "", palette2 = palette) {
  let minLength = Number.POSITIVE_INFINITY;
  for (let s of series)
    if (s.values = s.values.filter((v) => v[1] != "0"), s.values.length < minLength)
      minLength = s.values.length;
  for (let s of series)
    s.values = s.values.slice(-1 * minLength);
  let { POSITIVE_INFINITY: min, NEGATIVE_INFINITY: max } = Number, lines = [];
  for (let s of series) {
    let line = [];
    for (let [, value] of s.values) {
      let v = parseFloat(value);
      if (isNaN(v))
        v = 0;
      let vR = Math.round(v * 1000) / 1000, vF = Math.floor(v * 1000) / 1000, vC = Math.ceil(v * 1000) / 1000;
      if (line.push(vR), vF < min)
        min = vF;
      if (vC > max)
        max = vC;
    }
    lines.push(`line [${line.join()}]`);
  }
  return `\`\`\`mermaid
---
config:
    xyChart:
        width: 1200
        height: 400
    themeVariables:
        xyChart:
            titleColor: "#222"
            backgroundColor: "#fff"
            xAxisLineColor: "#222"
            yAxisLineColor: "#222"
            plotColorPalette: "${palette2.join()}"
---
xychart-beta
    title "${title}"
    x-axis "${xLabel}" 0 --> 10
    y-axis "${yLabel}" ${Math.floor(min * 0.9)} --> ${Math.ceil(max * 1.1)}
    ${lines.join(`
    `)}
\`\`\`
`;
}

// report/report.ts
var renderReport = (variant, metrics) => `\uD83C\uDF0B Here are results of SLO test for ${variant}:

### Operation Success Rate

${renderChart("operation_type=read", metrics.read_availability, "Time, m", "Success Rate, %")}

${renderChart("operation_type=write", metrics.write_availability, "\tTime, m", "Success Rate, %")}

### Operations Per Second

${renderChart("operation_type=read", metrics.read_throughput, "Time, m", "Operations")}

${renderChart("operation_type=write", metrics.write_throughput, "Time, m", "Operations")}

### 95th Percentile Latency

${renderChart("operation_type=read", metrics.read_latency_ms, "Time, m", "Latency, ms")}

${renderChart("operation_type=write", metrics.write_latency_ms, "Time, m", "Latency, ms")}
`;

// report/workflow.ts
var import_github = __toESM(require_github(), 1);
async function getCurrentWorkflowRuns(token, branch) {
  let {
    data: { workflows }
  } = await import_github.getOctokit(token).rest.actions.listRepoWorkflows({
    owner: import_github.context.repo.owner,
    repo: import_github.context.repo.repo
  }), workflow = workflows.find((workflow2) => workflow2.name === import_github.context.workflow);
  if (!workflow)
    return [];
  let {
    data: { workflow_runs }
  } = await import_github.getOctokit(token).rest.actions.listWorkflowRuns({
    owner: import_github.context.repo.owner,
    repo: import_github.context.repo.repo,
    workflow_id: workflow.id,
    branch,
    status: "completed"
  });
  return workflow_runs.filter((run) => run.conclusion === "success");
}

// report/main.ts
async function main() {
  let cwd = process.cwd(), token = import_core.getInput("github_token") || import_core.getInput("token"), workflowRunId = parseInt(import_core.getInput("github_run_id") || import_core.getInput("run_id")), artifactClient = new import_artifact.DefaultArtifactClient;
  fs.mkdirSync(cwd, { recursive: !0 }), import_core.info(`Current directory: ${cwd}`);
  let { artifacts } = await artifactClient.listArtifacts({
    findBy: {
      token,
      workflowRunId,
      repositoryOwner: import_github2.context.repo.owner,
      repositoryName: import_github2.context.repo.repo
    }
  });
  import_core.info(`Found ${artifacts.length} artifacts.`), import_core.debug(`Artifacts: ${JSON.stringify(artifacts, null, 4)}`);
  let rawPulls = {}, rawMetrics = {};
  for (let artifact of artifacts) {
    import_core.info(`Downloading artifact ${artifact.name}...`);
    let { downloadPath } = await artifactClient.downloadArtifact(artifact.id, {
      path: cwd,
      findBy: {
        token,
        workflowRunId,
        repositoryOwner: import_github2.context.repo.owner,
        repositoryName: import_github2.context.repo.repo
      }
    });
    if (downloadPath = path.join(downloadPath || cwd, artifact.name), import_core.info(`Downloaded artifact ${artifact.name} (${artifact.id}) to ${downloadPath}`), artifact.name.endsWith("-metrics.json")) {
      let workload = artifact.name.slice(0, -13);
      rawMetrics[workload] = fs.readFileSync(downloadPath, { encoding: "utf-8" });
    }
    if (artifact.name.endsWith("-pull.txt")) {
      let workload = artifact.name.slice(0, -9);
      rawPulls[workload] = fs.readFileSync(downloadPath, { encoding: "utf-8" });
    }
  }
  let pulls = {}, metrics = {}, reports = {}, comments = {};
  for (let [workload, value] of Object.entries(rawPulls))
    pulls[workload] = parseInt(value);
  for (let [workload, value] of Object.entries(rawMetrics))
    metrics[workload] = JSON.parse(value);
  for (let workload of Object.keys(pulls)) {
    let pull = pulls[workload];
    if (!pull)
      continue;
    import_core.info(`Getting comments for ${pull}...`);
    let { data } = await import_github2.getOctokit(token).rest.issues.listComments({
      issue_number: pull,
      owner: import_github2.context.repo.owner,
      repo: import_github2.context.repo.repo
    });
    import_core.info(`Got ${data.length} comments for ${pull}`);
    for (let comment of data)
      if ((comment.body || comment.body_text || comment.body_html)?.includes(`Here are results of SLO test for ${workload}`)) {
        import_core.info(`Found comment for ${workload}: ${comment.html_url}`), comments[workload] = comment.id;
        break;
      }
  }
  for (let workload of Object.keys(pulls)) {
    let pull = pulls[workload];
    if (!pull)
      continue;
    import_core.debug(`Pull request number: ${pull}`), import_core.info("Fetching information about pull request...");
    let { data: pr } = await import_github2.getOctokit(token).rest.pulls.get({
      owner: import_github2.context.repo.owner,
      repo: import_github2.context.repo.repo,
      pull_number: pull
    });
    import_core.info(`Pull request information fetched: ${pr.html_url}`), import_core.debug(`Pull request information: ${JSON.stringify(pr, null, 4)}`), import_core.info("Fetching information about previous runs for base branch...");
    let runs = await getCurrentWorkflowRuns(token, pr.base.ref);
    if (import_core.info(`Found ${runs.length} completed and successful runs for default branch.`), import_core.debug(`Previous runs for base branch: ${JSON.stringify(runs.map((run) => ({ id: run.id, upd: run.updated_at })), null, 4)}`), runs.length === 0) {
      import_core.warning("No previous runs found.");
      continue;
    }
    import_core.info("Finding latest run...");
    let latestRun = runs[0];
    import_core.info(`Latest run: ${latestRun.url}`), import_core.debug(`Latest run: ${JSON.stringify(latestRun, null, 4)}`), import_core.info("Finding latest run artifacts...");
    let {
      data: { artifacts: artifacts2 }
    } = await import_github2.getOctokit(token).rest.actions.listWorkflowRunArtifacts({
      owner: import_github2.context.repo.owner,
      repo: import_github2.context.repo.repo,
      run_id: latestRun.id
    });
    import_core.info(`Found ${artifacts2.length} artifacts.`), import_core.debug(`Latest run artifacts: ${JSON.stringify(artifacts2, null, 4)}`);
    let artifact = artifacts2.find((artifact2) => artifact2.name === `${workload}-metrics.json`);
    if (!artifact || artifact.expired)
      import_core.warning("Metrics for base ref not found or expired.");
    else {
      import_core.debug(`Metrics artifact: ${JSON.stringify(artifact, null, 4)}`), import_core.info(`Downloading artifact ${artifact.id}...`);
      let { downloadPath } = await artifactClient.downloadArtifact(artifact.id, {
        path: cwd,
        findBy: {
          token,
          workflowRunId: latestRun.workflow_id,
          repositoryOwner: import_github2.context.repo.owner,
          repositoryName: import_github2.context.repo.repo
        }
      });
      downloadPath ??= path.join(cwd, artifact.name), import_core.info(`Downloaded artifact ${artifact.id} to ${downloadPath}`), import_core.info(`Extracting metrics from artifact ${artifact.id}...`);
      let baseMetrics = JSON.parse(fs.readFileSync(downloadPath, { encoding: "utf-8" }));
      import_core.info(`Metrics extracted from artifact ${artifact.id}: ${Object.keys(baseMetrics)}`), import_core.debug(`Base metrics: ${JSON.stringify(baseMetrics, null, 4)}`), import_core.info("Merging metrics...");
      for (let [name, baseSeries] of Object.entries(baseMetrics)) {
        if (!metrics[workload][name])
          continue;
        metrics[workload][name] = metrics[workload][name].concat(baseSeries);
      }
    }
  }
  for (let workload of Object.keys(metrics)) {
    if (!metrics[workload])
      continue;
    import_core.info("Rendering report...");
    let report = renderReport(workload, metrics[workload]);
    import_core.debug(`Report: ${report}`), reports[workload] = report;
  }
  for (let workload of Object.keys(pulls)) {
    let pull = pulls[workload], report = reports[workload], commentId = comments[workload];
    if (!report)
      continue;
    if (commentId) {
      import_core.info(`Updating report for ${pull}...`);
      let { data } = await import_github2.getOctokit(token).rest.issues.updateComment({
        comment_id: commentId,
        owner: import_github2.context.repo.owner,
        repo: import_github2.context.repo.repo,
        body: report
      });
      import_core.info(`Report for was ${pull} updated: ${data.html_url}`);
    } else {
      import_core.info(`Creating report for ${pull}...`);
      let { data } = await import_github2.getOctokit(token).rest.issues.createComment({
        issue_number: pull,
        owner: import_github2.context.repo.owner,
        repo: import_github2.context.repo.repo,
        body: report
      });
      import_core.info(`Report for ${pull} created: ${data.html_url}`);
    }
  }
}
main();

//# debugId=9681D1489EF03AE164756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vcmVwb3J0L21haW4udHMiLCAiLi4vcmVwb3J0L2NvbG9ycy50cyIsICIuLi9yZXBvcnQvY2hhcnQudHMiLCAiLi4vcmVwb3J0L3JlcG9ydC50cyIsICIuLi9yZXBvcnQvd29ya2Zsb3cudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbCiAgICAiaW1wb3J0ICogYXMgZnMgZnJvbSAnbm9kZTpmcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJ1xuXG5pbXBvcnQgeyBEZWZhdWx0QXJ0aWZhY3RDbGllbnQgfSBmcm9tICdAYWN0aW9ucy9hcnRpZmFjdCdcbmltcG9ydCB7IGRlYnVnLCBnZXRJbnB1dCwgaW5mbywgd2FybmluZyB9IGZyb20gJ0BhY3Rpb25zL2NvcmUnXG5pbXBvcnQgeyBjb250ZXh0LCBnZXRPY3Rva2l0IH0gZnJvbSAnQGFjdGlvbnMvZ2l0aHViJ1xuaW1wb3J0IHsgcmVuZGVyUmVwb3J0IH0gZnJvbSAnLi9yZXBvcnQuanMnXG5pbXBvcnQgeyBnZXRDdXJyZW50V29ya2Zsb3dSdW5zIH0gZnJvbSAnLi93b3JrZmxvdy5qcydcbmltcG9ydCB0eXBlIHsgTWV0cmljcyB9IGZyb20gJy4vbWV0cmljcy5qcydcblxudHlwZSB3b3JrbG9hZCA9IHN0cmluZyAmIHsgX190eXBlOiAnd29ya2xvYWQnIH1cblxuYXN5bmMgZnVuY3Rpb24gbWFpbigpIHtcblx0bGV0IGN3ZCA9IHByb2Nlc3MuY3dkKClcblx0bGV0IHRva2VuID0gZ2V0SW5wdXQoJ2dpdGh1Yl90b2tlbicpIHx8IGdldElucHV0KCd0b2tlbicpXG5cdGxldCB3b3JrZmxvd1J1bklkID0gcGFyc2VJbnQoZ2V0SW5wdXQoJ2dpdGh1Yl9ydW5faWQnKSB8fCBnZXRJbnB1dCgncnVuX2lkJykpXG5cdGxldCBhcnRpZmFjdENsaWVudCA9IG5ldyBEZWZhdWx0QXJ0aWZhY3RDbGllbnQoKVxuXG5cdGZzLm1rZGlyU3luYyhjd2QsIHsgcmVjdXJzaXZlOiB0cnVlIH0pXG5cblx0aW5mbyhgQ3VycmVudCBkaXJlY3Rvcnk6ICR7Y3dkfWApXG5cblx0bGV0IHsgYXJ0aWZhY3RzIH0gPSBhd2FpdCBhcnRpZmFjdENsaWVudC5saXN0QXJ0aWZhY3RzKHtcblx0XHRmaW5kQnk6IHtcblx0XHRcdHRva2VuLFxuXHRcdFx0d29ya2Zsb3dSdW5JZCxcblx0XHRcdHJlcG9zaXRvcnlPd25lcjogY29udGV4dC5yZXBvLm93bmVyLFxuXHRcdFx0cmVwb3NpdG9yeU5hbWU6IGNvbnRleHQucmVwby5yZXBvLFxuXHRcdH0sXG5cdH0pXG5cblx0aW5mbyhgRm91bmQgJHthcnRpZmFjdHMubGVuZ3RofSBhcnRpZmFjdHMuYClcblx0ZGVidWcoYEFydGlmYWN0czogJHtKU09OLnN0cmluZ2lmeShhcnRpZmFjdHMsIG51bGwsIDQpfWApXG5cblx0bGV0IHJhd1B1bGxzOiBSZWNvcmQ8d29ya2xvYWQsIHN0cmluZz4gPSB7fVxuXHRsZXQgcmF3TWV0cmljczogUmVjb3JkPHdvcmtsb2FkLCBzdHJpbmc+ID0ge31cblxuXHQvLyBEb3dubG9hZCBhcnRpZmFjdHNcblx0Zm9yIChsZXQgYXJ0aWZhY3Qgb2YgYXJ0aWZhY3RzKSB7XG5cdFx0aW5mbyhgRG93bmxvYWRpbmcgYXJ0aWZhY3QgJHthcnRpZmFjdC5uYW1lfS4uLmApXG5cdFx0bGV0IHsgZG93bmxvYWRQYXRoIH0gPSBhd2FpdCBhcnRpZmFjdENsaWVudC5kb3dubG9hZEFydGlmYWN0KGFydGlmYWN0LmlkLCB7XG5cdFx0XHRwYXRoOiBjd2QsXG5cdFx0XHRmaW5kQnk6IHtcblx0XHRcdFx0dG9rZW4sXG5cdFx0XHRcdHdvcmtmbG93UnVuSWQsXG5cdFx0XHRcdHJlcG9zaXRvcnlPd25lcjogY29udGV4dC5yZXBvLm93bmVyLFxuXHRcdFx0XHRyZXBvc2l0b3J5TmFtZTogY29udGV4dC5yZXBvLnJlcG8sXG5cdFx0XHR9LFxuXHRcdH0pXG5cblx0XHRkb3dubG9hZFBhdGggPSBwYXRoLmpvaW4oZG93bmxvYWRQYXRoIHx8IGN3ZCwgYXJ0aWZhY3QubmFtZSlcblxuXHRcdGluZm8oYERvd25sb2FkZWQgYXJ0aWZhY3QgJHthcnRpZmFjdC5uYW1lfSAoJHthcnRpZmFjdC5pZH0pIHRvICR7ZG93bmxvYWRQYXRofWApXG5cblx0XHRpZiAoYXJ0aWZhY3QubmFtZS5lbmRzV2l0aCgnLW1ldHJpY3MuanNvbicpKSB7XG5cdFx0XHRsZXQgd29ya2xvYWQgPSBhcnRpZmFjdC5uYW1lLnNsaWNlKDAsIC0nLW1ldHJpY3MuanNvbicubGVuZ3RoKSBhcyB3b3JrbG9hZFxuXHRcdFx0cmF3TWV0cmljc1t3b3JrbG9hZF0gPSBmcy5yZWFkRmlsZVN5bmMoZG93bmxvYWRQYXRoLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pXG5cdFx0fVxuXG5cdFx0aWYgKGFydGlmYWN0Lm5hbWUuZW5kc1dpdGgoJy1wdWxsLnR4dCcpKSB7XG5cdFx0XHRsZXQgd29ya2xvYWQgPSBhcnRpZmFjdC5uYW1lLnNsaWNlKDAsIC0nLXB1bGwudHh0Jy5sZW5ndGgpIGFzIHdvcmtsb2FkXG5cdFx0XHRyYXdQdWxsc1t3b3JrbG9hZF0gPSBmcy5yZWFkRmlsZVN5bmMoZG93bmxvYWRQYXRoLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pXG5cdFx0fVxuXHR9XG5cblx0bGV0IHB1bGxzOiBSZWNvcmQ8d29ya2xvYWQsIG51bWJlcj4gPSB7fVxuXHRsZXQgbWV0cmljczogUmVjb3JkPHdvcmtsb2FkLCBNZXRyaWNzPiA9IHt9XG5cdGxldCByZXBvcnRzOiBSZWNvcmQ8d29ya2xvYWQsIHN0cmluZz4gPSB7fVxuXHRsZXQgY29tbWVudHM6IFJlY29yZDx3b3JrbG9hZCwgbnVtYmVyPiA9IHt9XG5cblx0Ly8gUGFyc2UgaGVhZCBwdWxsc1xuXHRmb3IgKGxldCBbd29ya2xvYWQsIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhyYXdQdWxscykgYXMgW3dvcmtsb2FkLCBzdHJpbmddW10pIHtcblx0XHRwdWxsc1t3b3JrbG9hZF0gPSBwYXJzZUludCh2YWx1ZSlcblx0fVxuXG5cdC8vIFBhcnNlIGhlYWQgbWV0cmljc1xuXHRmb3IgKGxldCBbd29ya2xvYWQsIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhyYXdNZXRyaWNzKSBhcyBbd29ya2xvYWQsIHN0cmluZ11bXSkge1xuXHRcdG1ldHJpY3Nbd29ya2xvYWRdID0gSlNPTi5wYXJzZSh2YWx1ZSlcblx0fVxuXG5cdC8vIFJldHJpZXZlIHdvcmtsb2FkIHJlcG9ydCBjb21tZW50IGluIHB1bGxcblx0Zm9yIChsZXQgd29ya2xvYWQgb2YgT2JqZWN0LmtleXMocHVsbHMpIGFzIHdvcmtsb2FkW10pIHtcblx0XHRsZXQgcHVsbCA9IHB1bGxzW3dvcmtsb2FkXVxuXHRcdGlmICghcHVsbCkge1xuXHRcdFx0Y29udGludWVcblx0XHR9XG5cblx0XHRpbmZvKGBHZXR0aW5nIGNvbW1lbnRzIGZvciAke3B1bGx9Li4uYClcblx0XHRsZXQgeyBkYXRhIH0gPSBhd2FpdCBnZXRPY3Rva2l0KHRva2VuKS5yZXN0Lmlzc3Vlcy5saXN0Q29tbWVudHMoe1xuXHRcdFx0aXNzdWVfbnVtYmVyOiBwdWxsLFxuXHRcdFx0b3duZXI6IGNvbnRleHQucmVwby5vd25lcixcblx0XHRcdHJlcG86IGNvbnRleHQucmVwby5yZXBvLFxuXHRcdH0pXG5cdFx0aW5mbyhgR290ICR7ZGF0YS5sZW5ndGh9IGNvbW1lbnRzIGZvciAke3B1bGx9YClcblxuXHRcdGZvciAobGV0IGNvbW1lbnQgb2YgZGF0YSkge1xuXHRcdFx0Ly8gVE9ETzogcmVmYWN0b3IgZmluZGluZyByZXBvcnQgY29tbWVudFxuXHRcdFx0aWYgKFxuXHRcdFx0XHQoY29tbWVudC5ib2R5IHx8IGNvbW1lbnQuYm9keV90ZXh0IHx8IGNvbW1lbnQuYm9keV9odG1sKT8uaW5jbHVkZXMoXG5cdFx0XHRcdFx0YEhlcmUgYXJlIHJlc3VsdHMgb2YgU0xPIHRlc3QgZm9yICR7d29ya2xvYWR9YFxuXHRcdFx0XHQpXG5cdFx0XHQpIHtcblx0XHRcdFx0aW5mbyhgRm91bmQgY29tbWVudCBmb3IgJHt3b3JrbG9hZH06ICR7Y29tbWVudC5odG1sX3VybH1gKVxuXHRcdFx0XHRjb21tZW50c1t3b3JrbG9hZF0gPSBjb21tZW50LmlkXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Ly8gUmV0cml2ZSBtZXRyaWNzIGZvciBiYXNlIGJyYW5jaFxuXHRmb3IgKGxldCB3b3JrbG9hZCBvZiBPYmplY3Qua2V5cyhwdWxscykgYXMgd29ya2xvYWRbXSkge1xuXHRcdGxldCBwdWxsID0gcHVsbHNbd29ya2xvYWRdXG5cdFx0aWYgKCFwdWxsKSB7XG5cdFx0XHRjb250aW51ZVxuXHRcdH1cblxuXHRcdGRlYnVnKGBQdWxsIHJlcXVlc3QgbnVtYmVyOiAke3B1bGx9YClcblxuXHRcdGluZm8oJ0ZldGNoaW5nIGluZm9ybWF0aW9uIGFib3V0IHB1bGwgcmVxdWVzdC4uLicpXG5cdFx0bGV0IHsgZGF0YTogcHIgfSA9IGF3YWl0IGdldE9jdG9raXQodG9rZW4pLnJlc3QucHVsbHMuZ2V0KHtcblx0XHRcdG93bmVyOiBjb250ZXh0LnJlcG8ub3duZXIsXG5cdFx0XHRyZXBvOiBjb250ZXh0LnJlcG8ucmVwbyxcblx0XHRcdHB1bGxfbnVtYmVyOiBwdWxsLFxuXHRcdH0pXG5cdFx0aW5mbyhgUHVsbCByZXF1ZXN0IGluZm9ybWF0aW9uIGZldGNoZWQ6ICR7cHIuaHRtbF91cmx9YClcblx0XHRkZWJ1ZyhgUHVsbCByZXF1ZXN0IGluZm9ybWF0aW9uOiAke0pTT04uc3RyaW5naWZ5KHByLCBudWxsLCA0KX1gKVxuXG5cdFx0aW5mbyhgRmV0Y2hpbmcgaW5mb3JtYXRpb24gYWJvdXQgcHJldmlvdXMgcnVucyBmb3IgYmFzZSBicmFuY2guLi5gKVxuXHRcdGxldCBydW5zID0gYXdhaXQgZ2V0Q3VycmVudFdvcmtmbG93UnVucyh0b2tlbiwgcHIuYmFzZS5yZWYpXG5cdFx0aW5mbyhgRm91bmQgJHtydW5zLmxlbmd0aH0gY29tcGxldGVkIGFuZCBzdWNjZXNzZnVsIHJ1bnMgZm9yIGRlZmF1bHQgYnJhbmNoLmApXG5cdFx0ZGVidWcoXG5cdFx0XHRgUHJldmlvdXMgcnVucyBmb3IgYmFzZSBicmFuY2g6ICR7SlNPTi5zdHJpbmdpZnkoXG5cdFx0XHRcdHJ1bnMubWFwKChydW4pID0+ICh7IGlkOiBydW4uaWQsIHVwZDogcnVuLnVwZGF0ZWRfYXQgfSkpLFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHQ0XG5cdFx0XHQpfWBcblx0XHQpXG5cblx0XHRpZiAocnVucy5sZW5ndGggPT09IDApIHtcblx0XHRcdHdhcm5pbmcoJ05vIHByZXZpb3VzIHJ1bnMgZm91bmQuJylcblx0XHRcdGNvbnRpbnVlXG5cdFx0fVxuXG5cdFx0aW5mbyhgRmluZGluZyBsYXRlc3QgcnVuLi4uYClcblx0XHRsZXQgbGF0ZXN0UnVuID0gcnVuc1swXVxuXHRcdGluZm8oYExhdGVzdCBydW46ICR7bGF0ZXN0UnVuLnVybH1gKVxuXHRcdGRlYnVnKGBMYXRlc3QgcnVuOiAke0pTT04uc3RyaW5naWZ5KGxhdGVzdFJ1biwgbnVsbCwgNCl9YClcblxuXHRcdGluZm8oYEZpbmRpbmcgbGF0ZXN0IHJ1biBhcnRpZmFjdHMuLi5gKVxuXHRcdGxldCB7XG5cdFx0XHRkYXRhOiB7IGFydGlmYWN0cyB9LFxuXHRcdH0gPSBhd2FpdCBnZXRPY3Rva2l0KHRva2VuKS5yZXN0LmFjdGlvbnMubGlzdFdvcmtmbG93UnVuQXJ0aWZhY3RzKHtcblx0XHRcdG93bmVyOiBjb250ZXh0LnJlcG8ub3duZXIsXG5cdFx0XHRyZXBvOiBjb250ZXh0LnJlcG8ucmVwbyxcblx0XHRcdHJ1bl9pZDogbGF0ZXN0UnVuLmlkLFxuXHRcdH0pXG5cdFx0aW5mbyhgRm91bmQgJHthcnRpZmFjdHMubGVuZ3RofSBhcnRpZmFjdHMuYClcblx0XHRkZWJ1ZyhgTGF0ZXN0IHJ1biBhcnRpZmFjdHM6ICR7SlNPTi5zdHJpbmdpZnkoYXJ0aWZhY3RzLCBudWxsLCA0KX1gKVxuXG5cdFx0bGV0IGFydGlmYWN0ID0gYXJ0aWZhY3RzLmZpbmQoKGFydGlmYWN0KSA9PiBhcnRpZmFjdC5uYW1lID09PSBgJHt3b3JrbG9hZH0tbWV0cmljcy5qc29uYClcblx0XHRpZiAoIWFydGlmYWN0IHx8IGFydGlmYWN0LmV4cGlyZWQpIHtcblx0XHRcdHdhcm5pbmcoJ01ldHJpY3MgZm9yIGJhc2UgcmVmIG5vdCBmb3VuZCBvciBleHBpcmVkLicpXG5cdFx0fSBlbHNlIHtcblx0XHRcdGRlYnVnKGBNZXRyaWNzIGFydGlmYWN0OiAke0pTT04uc3RyaW5naWZ5KGFydGlmYWN0LCBudWxsLCA0KX1gKVxuXG5cdFx0XHRpbmZvKGBEb3dubG9hZGluZyBhcnRpZmFjdCAke2FydGlmYWN0LmlkfS4uLmApXG5cdFx0XHRsZXQgeyBkb3dubG9hZFBhdGggfSA9IGF3YWl0IGFydGlmYWN0Q2xpZW50LmRvd25sb2FkQXJ0aWZhY3QoYXJ0aWZhY3QuaWQsIHtcblx0XHRcdFx0cGF0aDogY3dkLFxuXHRcdFx0XHRmaW5kQnk6IHtcblx0XHRcdFx0XHR0b2tlbixcblx0XHRcdFx0XHR3b3JrZmxvd1J1bklkOiBsYXRlc3RSdW4ud29ya2Zsb3dfaWQsXG5cdFx0XHRcdFx0cmVwb3NpdG9yeU93bmVyOiBjb250ZXh0LnJlcG8ub3duZXIsXG5cdFx0XHRcdFx0cmVwb3NpdG9yeU5hbWU6IGNvbnRleHQucmVwby5yZXBvLFxuXHRcdFx0XHR9LFxuXHRcdFx0fSlcblxuXHRcdFx0ZG93bmxvYWRQYXRoID8/PSBwYXRoLmpvaW4oY3dkLCBhcnRpZmFjdC5uYW1lKVxuXG5cdFx0XHRpbmZvKGBEb3dubG9hZGVkIGFydGlmYWN0ICR7YXJ0aWZhY3QuaWR9IHRvICR7ZG93bmxvYWRQYXRofWApXG5cblx0XHRcdGluZm8oYEV4dHJhY3RpbmcgbWV0cmljcyBmcm9tIGFydGlmYWN0ICR7YXJ0aWZhY3QuaWR9Li4uYClcblx0XHRcdGxldCBiYXNlTWV0cmljcyA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGRvd25sb2FkUGF0aCwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KSkgYXMgTWV0cmljc1xuXG5cdFx0XHRpbmZvKGBNZXRyaWNzIGV4dHJhY3RlZCBmcm9tIGFydGlmYWN0ICR7YXJ0aWZhY3QuaWR9OiAke09iamVjdC5rZXlzKGJhc2VNZXRyaWNzKX1gKVxuXHRcdFx0ZGVidWcoYEJhc2UgbWV0cmljczogJHtKU09OLnN0cmluZ2lmeShiYXNlTWV0cmljcywgbnVsbCwgNCl9YClcblxuXHRcdFx0aW5mbyhgTWVyZ2luZyBtZXRyaWNzLi4uYClcblx0XHRcdGZvciAobGV0IFtuYW1lLCBiYXNlU2VyaWVzXSBvZiBPYmplY3QuZW50cmllcyhiYXNlTWV0cmljcykpIHtcblx0XHRcdFx0aWYgKCFtZXRyaWNzW3dvcmtsb2FkXVtuYW1lXSkgY29udGludWVcblxuXHRcdFx0XHQvLyBiYXNlIG1ldHJpY3MgYWx3YXlzIG11c3QgYmUgdGhlIHNlY29uZFxuXHRcdFx0XHRtZXRyaWNzW3dvcmtsb2FkXVtuYW1lXSA9IG1ldHJpY3Nbd29ya2xvYWRdW25hbWVdLmNvbmNhdChiYXNlU2VyaWVzKVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vIFJlbmRlcmluZyByZXBvcnRzXG5cdGZvciAobGV0IHdvcmtsb2FkIG9mIE9iamVjdC5rZXlzKG1ldHJpY3MpIGFzIHdvcmtsb2FkW10pIHtcblx0XHRpZiAoIW1ldHJpY3Nbd29ya2xvYWRdKSB7XG5cdFx0XHRjb250aW51ZVxuXHRcdH1cblxuXHRcdGluZm8oJ1JlbmRlcmluZyByZXBvcnQuLi4nKVxuXHRcdGxldCByZXBvcnQgPSByZW5kZXJSZXBvcnQod29ya2xvYWQsIG1ldHJpY3Nbd29ya2xvYWRdKVxuXHRcdGRlYnVnKGBSZXBvcnQ6ICR7cmVwb3J0fWApXG5cblx0XHRyZXBvcnRzW3dvcmtsb2FkXSA9IHJlcG9ydFxuXHR9XG5cblx0Ly8gQ29tbWl0IHJlcG9ydCBhcyBwdWxsIGNvbW1lbnRcblx0Zm9yIChsZXQgd29ya2xvYWQgb2YgT2JqZWN0LmtleXMocHVsbHMpIGFzIHdvcmtsb2FkW10pIHtcblx0XHRsZXQgcHVsbCA9IHB1bGxzW3dvcmtsb2FkXVxuXHRcdGxldCByZXBvcnQgPSByZXBvcnRzW3dvcmtsb2FkXVxuXHRcdGxldCBjb21tZW50SWQgPSBjb21tZW50c1t3b3JrbG9hZF1cblxuXHRcdGlmICghcmVwb3J0KSB7XG5cdFx0XHRjb250aW51ZVxuXHRcdH1cblxuXHRcdGlmIChjb21tZW50SWQpIHtcblx0XHRcdGluZm8oYFVwZGF0aW5nIHJlcG9ydCBmb3IgJHtwdWxsfS4uLmApXG5cdFx0XHRsZXQgeyBkYXRhIH0gPSBhd2FpdCBnZXRPY3Rva2l0KHRva2VuKS5yZXN0Lmlzc3Vlcy51cGRhdGVDb21tZW50KHtcblx0XHRcdFx0Y29tbWVudF9pZDogY29tbWVudElkLFxuXHRcdFx0XHRvd25lcjogY29udGV4dC5yZXBvLm93bmVyLFxuXHRcdFx0XHRyZXBvOiBjb250ZXh0LnJlcG8ucmVwbyxcblx0XHRcdFx0Ym9keTogcmVwb3J0LFxuXHRcdFx0fSlcblx0XHRcdGluZm8oYFJlcG9ydCBmb3Igd2FzICR7cHVsbH0gdXBkYXRlZDogJHtkYXRhLmh0bWxfdXJsfWApXG5cdFx0fSBlbHNlIHtcblx0XHRcdGluZm8oYENyZWF0aW5nIHJlcG9ydCBmb3IgJHtwdWxsfS4uLmApXG5cdFx0XHRsZXQgeyBkYXRhIH0gPSBhd2FpdCBnZXRPY3Rva2l0KHRva2VuKS5yZXN0Lmlzc3Vlcy5jcmVhdGVDb21tZW50KHtcblx0XHRcdFx0aXNzdWVfbnVtYmVyOiBwdWxsLFxuXHRcdFx0XHRvd25lcjogY29udGV4dC5yZXBvLm93bmVyLFxuXHRcdFx0XHRyZXBvOiBjb250ZXh0LnJlcG8ucmVwbyxcblx0XHRcdFx0Ym9keTogcmVwb3J0LFxuXHRcdFx0fSlcblx0XHRcdGluZm8oYFJlcG9ydCBmb3IgJHtwdWxsfSBjcmVhdGVkOiAke2RhdGEuaHRtbF91cmx9YClcblx0XHR9XG5cdH1cbn1cblxubWFpbigpXG4iLAogICAgIi8vIFRhYmxlYXUgMTBcbmV4cG9ydCBjb25zdCBwYWxldHRlID0gW1xuXHQnI0ZGN0YwRScsXG5cdCcjMUY3N0I0Jyxcblx0JyNENjI3MjgnLFxuXHQnIzJDQTAyQycsXG5cdCcjOTQ2N0JEJyxcblx0JyM4QzU2NEInLFxuXHQnI0UzNzdDMicsXG5cdCcjN0Y3RjdGJyxcblx0JyNCQ0JEMjInLFxuXHQnIzE3QkVDRicsXG5dXG4iLAogICAgImltcG9ydCB7IHBhbGV0dGUgYXMgZGVmYXVsdFBhbGV0dGUgfSBmcm9tICcuL2NvbG9ycy5qcydcbmltcG9ydCB0eXBlIHsgU2VyaWVzIH0gZnJvbSAnLi9tZXRyaWNzLmpzJ1xuXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyQ2hhcnQoXG5cdHRpdGxlOiBzdHJpbmcsXG5cdHNlcmllczogU2VyaWVzW10sXG5cdHhMYWJlbCA9ICcnLFxuXHR5TGFiZWwgPSAnJyxcblx0cGFsZXR0ZSA9IGRlZmF1bHRQYWxldHRlXG4pOiBzdHJpbmcge1xuXHQvLyAxLiBGaWx0ZXIgemVyb3Ncblx0bGV0IG1pbkxlbmd0aCA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWVxuXHRmb3IgKGNvbnN0IHMgb2Ygc2VyaWVzKSB7XG5cdFx0cy52YWx1ZXMgPSBzLnZhbHVlcy5maWx0ZXIoKHYpID0+IHZbMV0gIT0gJzAnKVxuXHRcdGlmIChzLnZhbHVlcy5sZW5ndGggPCBtaW5MZW5ndGgpIG1pbkxlbmd0aCA9IHMudmFsdWVzLmxlbmd0aFxuXHR9XG5cblx0Ly8gMi4gTGltaXQgdmFsdWVzIChjb3VudClcblx0Zm9yIChjb25zdCBzIG9mIHNlcmllcykge1xuXHRcdC8vIFNraXAgZmlyc3QgdmFsdWVzIHRoZW4gYWRqdXN0aW5nXG5cdFx0cy52YWx1ZXMgPSBzLnZhbHVlcy5zbGljZSgtMSAqIG1pbkxlbmd0aClcblx0fVxuXG5cdGxldCBtaW4gPSBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFlcblx0bGV0IG1heCA9IE51bWJlci5ORUdBVElWRV9JTkZJTklUWVxuXG5cdGxldCBsaW5lczogc3RyaW5nW10gPSBbXVxuXHRmb3IgKGNvbnN0IHMgb2Ygc2VyaWVzKSB7XG5cdFx0bGV0IGxpbmU6IG51bWJlcltdID0gW11cblxuXHRcdGZvciAobGV0IFssIHZhbHVlXSBvZiBzLnZhbHVlcykge1xuXHRcdFx0bGV0IHYgPSBwYXJzZUZsb2F0KHZhbHVlKVxuXHRcdFx0aWYgKGlzTmFOKHYpKSB7XG5cdFx0XHRcdHYgPSAwXG5cdFx0XHR9XG5cblx0XHRcdGxldCB2UiA9IE1hdGgucm91bmQodiAqIDEwMDApIC8gMTAwMFxuXHRcdFx0bGV0IHZGID0gTWF0aC5mbG9vcih2ICogMTAwMCkgLyAxMDAwXG5cdFx0XHRsZXQgdkMgPSBNYXRoLmNlaWwodiAqIDEwMDApIC8gMTAwMFxuXG5cdFx0XHRsaW5lLnB1c2godlIpXG5cblx0XHRcdGlmICh2RiA8IG1pbikgbWluID0gdkZcblx0XHRcdGlmICh2QyA+IG1heCkgbWF4ID0gdkNcblx0XHR9XG5cblx0XHRsaW5lcy5wdXNoKGBsaW5lIFske2xpbmUuam9pbigpfV1gKVxuXHR9XG5cblx0cmV0dXJuIGBcXGBcXGBcXGBtZXJtYWlkXG4tLS1cbmNvbmZpZzpcbiAgICB4eUNoYXJ0OlxuICAgICAgICB3aWR0aDogMTIwMFxuICAgICAgICBoZWlnaHQ6IDQwMFxuICAgIHRoZW1lVmFyaWFibGVzOlxuICAgICAgICB4eUNoYXJ0OlxuICAgICAgICAgICAgdGl0bGVDb2xvcjogXCIjMjIyXCJcbiAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogXCIjZmZmXCJcbiAgICAgICAgICAgIHhBeGlzTGluZUNvbG9yOiBcIiMyMjJcIlxuICAgICAgICAgICAgeUF4aXNMaW5lQ29sb3I6IFwiIzIyMlwiXG4gICAgICAgICAgICBwbG90Q29sb3JQYWxldHRlOiBcIiR7cGFsZXR0ZS5qb2luKCl9XCJcbi0tLVxueHljaGFydC1iZXRhXG4gICAgdGl0bGUgXCIke3RpdGxlfVwiXG4gICAgeC1heGlzIFwiJHt4TGFiZWx9XCIgMCAtLT4gMTBcbiAgICB5LWF4aXMgXCIke3lMYWJlbH1cIiAke01hdGguZmxvb3IobWluICogMC45KX0gLS0+ICR7TWF0aC5jZWlsKG1heCAqIDEuMSl9XG4gICAgJHtsaW5lcy5qb2luKCdcXG4gICAgJyl9XG5cXGBcXGBcXGBcbmBcbn1cbiIsCiAgICAiaW1wb3J0IHsgcmVuZGVyQ2hhcnQgfSBmcm9tICcuL2NoYXJ0LmpzJ1xuaW1wb3J0IHR5cGUgeyBNZXRyaWNzIH0gZnJvbSAnLi9tZXRyaWNzLmpzJ1xuXG5leHBvcnQgY29uc3QgcmVuZGVyUmVwb3J0ID0gKHZhcmlhbnQ6IHN0cmluZywgbWV0cmljczogTWV0cmljcykgPT4gYPCfjIsgSGVyZSBhcmUgcmVzdWx0cyBvZiBTTE8gdGVzdCBmb3IgJHt2YXJpYW50fTpcblxuIyMjIE9wZXJhdGlvbiBTdWNjZXNzIFJhdGVcblxuJHtyZW5kZXJDaGFydCgnb3BlcmF0aW9uX3R5cGU9cmVhZCcsIG1ldHJpY3NbJ3JlYWRfYXZhaWxhYmlsaXR5J10sICdUaW1lLCBtJywgJ1N1Y2Nlc3MgUmF0ZSwgJScpfVxuXG4ke3JlbmRlckNoYXJ0KCdvcGVyYXRpb25fdHlwZT13cml0ZScsIG1ldHJpY3NbJ3dyaXRlX2F2YWlsYWJpbGl0eSddLCAnXHRUaW1lLCBtJywgJ1N1Y2Nlc3MgUmF0ZSwgJScpfVxuXG4jIyMgT3BlcmF0aW9ucyBQZXIgU2Vjb25kXG5cbiR7cmVuZGVyQ2hhcnQoJ29wZXJhdGlvbl90eXBlPXJlYWQnLCBtZXRyaWNzWydyZWFkX3Rocm91Z2hwdXQnXSwgJ1RpbWUsIG0nLCAnT3BlcmF0aW9ucycpfVxuXG4ke3JlbmRlckNoYXJ0KCdvcGVyYXRpb25fdHlwZT13cml0ZScsIG1ldHJpY3NbJ3dyaXRlX3Rocm91Z2hwdXQnXSwgJ1RpbWUsIG0nLCAnT3BlcmF0aW9ucycpfVxuXG4jIyMgOTV0aCBQZXJjZW50aWxlIExhdGVuY3lcblxuJHtyZW5kZXJDaGFydCgnb3BlcmF0aW9uX3R5cGU9cmVhZCcsIG1ldHJpY3NbJ3JlYWRfbGF0ZW5jeV9tcyddLCAnVGltZSwgbScsICdMYXRlbmN5LCBtcycpfVxuXG4ke3JlbmRlckNoYXJ0KCdvcGVyYXRpb25fdHlwZT13cml0ZScsIG1ldHJpY3NbJ3dyaXRlX2xhdGVuY3lfbXMnXSwgJ1RpbWUsIG0nLCAnTGF0ZW5jeSwgbXMnKX1cbmBcbiIsCiAgICAiaW1wb3J0IHsgY29udGV4dCwgZ2V0T2N0b2tpdCB9IGZyb20gJ0BhY3Rpb25zL2dpdGh1YidcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEN1cnJlbnRXb3JrZmxvd1J1bnModG9rZW46IHN0cmluZywgYnJhbmNoOiBzdHJpbmcpIHtcblx0bGV0IHtcblx0XHRkYXRhOiB7IHdvcmtmbG93cyB9LFxuXHR9ID0gYXdhaXQgZ2V0T2N0b2tpdCh0b2tlbikucmVzdC5hY3Rpb25zLmxpc3RSZXBvV29ya2Zsb3dzKHtcblx0XHRvd25lcjogY29udGV4dC5yZXBvLm93bmVyLFxuXHRcdHJlcG86IGNvbnRleHQucmVwby5yZXBvLFxuXHR9KVxuXG5cdGxldCB3b3JrZmxvdyA9IHdvcmtmbG93cy5maW5kKCh3b3JrZmxvdykgPT4gd29ya2Zsb3cubmFtZSA9PT0gY29udGV4dC53b3JrZmxvdylcblxuXHRpZiAoIXdvcmtmbG93KSB7XG5cdFx0cmV0dXJuIFtdXG5cdH1cblxuXHRsZXQge1xuXHRcdGRhdGE6IHsgd29ya2Zsb3dfcnVucyB9LFxuXHR9ID0gYXdhaXQgZ2V0T2N0b2tpdCh0b2tlbikucmVzdC5hY3Rpb25zLmxpc3RXb3JrZmxvd1J1bnMoe1xuXHRcdG93bmVyOiBjb250ZXh0LnJlcG8ub3duZXIsXG5cdFx0cmVwbzogY29udGV4dC5yZXBvLnJlcG8sXG5cdFx0d29ya2Zsb3dfaWQ6IHdvcmtmbG93LmlkLFxuXHRcdGJyYW5jaDogYnJhbmNoLFxuXHRcdHN0YXR1czogJ2NvbXBsZXRlZCcsXG5cdH0pXG5cblx0cmV0dXJuIHdvcmtmbG93X3J1bnMuZmlsdGVyKChydW4pID0+IHJ1bi5jb25jbHVzaW9uID09PSAnc3VjY2VzcycpXG59XG4iCiAgXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7QUFHQSxzREFDQSwwQ0FDQTtBQUxBO0FBQ0E7OztBQ0FPLElBQU0sVUFBVTtBQUFBLEVBQ3RCO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxF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QUFRLENBQUMsQ0FBQztBQUFBLE1BRWpGLGlCQUFLLG1DQUFtQyxTQUFTLE9BQU8sT0FBTyxLQUFLLFdBQVcsR0FBRyxHQUNsRixrQkFBTSxpQkFBaUIsS0FBSyxVQUFVLGFBQWEsTUFBTSxDQUFDLEdBQUcsR0FFN0QsaUJBQUssb0JBQW9CO0FBQUEsTUFDekIsVUFBVSxNQUFNLGVBQWUsT0FBTyxRQUFRLFdBQVcsR0FBRztBQUFBLFFBQzNELElBQUksQ0FBQyxRQUFRLFVBQVU7QUFBQSxVQUFPO0FBQUEsUUFHOUIsUUFBUSxVQUFVLFFBQVEsUUFBUSxVQUFVLE1BQU0sT0FBTyxVQUFVO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNdEUsU0FBUyxZQUFZLE9BQU8sS0FBSyxPQUFPLEdBQWlCO0FBQUEsSUFDeEQsSUFBSSxDQUFDLFFBQVE7QUFBQSxNQUNaO0FBQUEsSUFHRCxpQkFBSyxxQkFBcUI7QUFBQSxJQUMxQixJQUFJLFNBQVMsYUFBYSxVQUFVLFFBQVEsU0FBUztBQUFBLElBQ3JELGtCQUFNLFdBQVcsUUFBUSxHQUV6QixRQUFRLFlBQVk7QUFBQTtBQUFBLEVBSXJCLFNBQVMsWUFBWSxPQUFPLEtBQUssS0FBSyxHQUFpQjtBQUFBLElBQ3RELElBQUksT0FBTyxNQUFNLFdBQ2IsU0FBUyxRQUFRLFdBQ2pCLFlBQVksU0FBUztBQUFBLElBRXpCLElBQUksQ0FBQztBQUFBLE1BQ0o7QUFBQSxJQUdELElBQUksV0FBVztBQUFBLE1BQ2QsaUJBQUssdUJBQXVCLFNBQVM7QUFBQSxNQUNyQyxNQUFNLFNBQVMsTUFBTSwwQkFBVyxLQUFLLEVBQUUsS0FBSyxPQUFPLGNBQWM7QUFBQSxRQUNoRSxZQUFZO0FBQUEsUUFDWixPQUFPLHVCQUFRLEtBQUs7QUFBQSxRQUNwQixNQUFNLHVCQUFRLEtBQUs7QUFBQSxRQUNuQixNQUFNO0FBQUEsTUFDUCxDQUFDO0FBQUEsTUFDRCxpQkFBSyxrQkFBa0IsaUJBQWlCLEtBQUssVUFBVTtBQUFBLE1BQ2pEO0FBQUEsTUFDTixpQkFBSyx1QkFBdUIsU0FBUztBQUFBLE1BQ3JDLE1BQU0sU0FBUyxNQUFNLDBCQUFXLEtBQUssRUFBRSxLQUFLLE9BQU8sY0FBYztBQUFBLFFBQ2hFLGNBQWM7QUFBQSxRQUNkLE9BQU8sdUJBQVEsS0FBSztBQUFBLFFBQ3BCLE1BQU0sdUJBQVEsS0FBSztBQUFBLFFBQ25CLE1BQU07QUFBQSxNQUNQLENBQUM7QUFBQSxNQUNELGlCQUFLLGNBQWMsaUJBQWlCLEtBQUssVUFBVTtBQUFBO0FBQUE7QUFBQTtBQUt0RCxLQUFLOyIsCiAgImRlYnVnSWQiOiAiOTY4MUQxNDg5RUYwM0FFMTY0NzU2RTIxNjQ3NTZFMjEiLAogICJuYW1lcyI6IFtdCn0=
