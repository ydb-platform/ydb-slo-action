/* eslint-disable */

// dist/main.js
import * as fs from "node:fs";
import * as path from "node:path";
import { DefaultArtifactClient } from "@actions/artifact";
import { debug, getInput, info, warning } from "@actions/core";
import { context as context2, getOctokit as getOctokit2 } from "@actions/github";

// dist/report.js
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// dist/chart.js
import { createCanvas } from "canvas";
async function generateChart(options) {
  const { title, xLabel, yLabel, series, seriesLabels } = options;
  const width = 800;
  const height = 400;
  const padding = 50;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);
  ctx.font = "bold 16px Arial";
  ctx.fillStyle = "black";
  ctx.textAlign = "center";
  ctx.fillText(title, width / 2, padding / 2);
  ctx.beginPath();
  ctx.strokeStyle = "black";
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.fillText(xLabel, width / 2, height - padding / 2);
  ctx.save();
  ctx.translate(padding / 2, height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();
  const maxX = Math.max(...series.map((s) => s.length));
  const maxY = Math.max(...series.flat());
  const colors = ["#2196F3", "#F44336", "#4CAF50", "#FFC107"];
  series.forEach((data, index) => {
    ctx.beginPath();
    ctx.strokeStyle = colors[index % colors.length];
    ctx.lineWidth = 2;
    data.forEach((value, i) => {
      const x = padding + i / (maxX - 1) * (width - 2 * padding);
      const y = height - padding - value / maxY * (height - 2 * padding);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  });
  seriesLabels.forEach((label, index) => {
    const x = width - padding + 10;
    const y = padding + index * 20;
    ctx.fillStyle = colors[index % colors.length];
    ctx.fillRect(x, y, 10, 10);
    ctx.fillStyle = "black";
    ctx.textAlign = "left";
    ctx.fillText(label, x + 15, y + 10);
  });
  return canvas.toBuffer("image/png");
}

// dist/report.js
function extractValues(series) {
  if (!series || series.length === 0)
    return [];
  return series[0].values.map(([_, value]) => parseFloat(value));
}
async function renderReport(metrics) {
  const chartsDir = "charts";
  mkdirSync(chartsDir, { recursive: true });
  const report = ["# Metrics\n"];
  const availabilityChart = await generateChart({
    title: "Success Rate",
    xLabel: "Time, m",
    yLabel: "%",
    series: [extractValues(metrics.read_availability), extractValues(metrics.write_availability)],
    seriesLabels: ["Read", "Write"]
  });
  const availabilityPath = join(chartsDir, "availability.png");
  writeFileSync(availabilityPath, availabilityChart);
  report.push(`## Success Rate
![Success Rate](${availabilityPath})
`);
  const throughputChart = await generateChart({
    title: "Operations Per Second",
    xLabel: "Time, m",
    yLabel: "ops",
    series: [extractValues(metrics.read_throughput), extractValues(metrics.write_throughput)],
    seriesLabels: ["Read", "Write"]
  });
  const throughputPath = join(chartsDir, "throughput.png");
  writeFileSync(throughputPath, throughputChart);
  report.push(`## Operations Per Second
![Operations Per Second](${throughputPath})
`);
  const latencyChart = await generateChart({
    title: "95th Percentile Latency",
    xLabel: "Time, m",
    yLabel: "ms",
    series: [extractValues(metrics.read_latency_ms), extractValues(metrics.write_latency_ms)],
    seriesLabels: ["Read", "Write"]
  });
  const latencyPath = join(chartsDir, "latency.png");
  writeFileSync(latencyPath, latencyChart);
  report.push(`## 95th Percentile Latency
![95th Percentile Latency](${latencyPath})
`);
  return report.join("\n");
}

// dist/workflow.js
import { context, getOctokit } from "@actions/github";
async function getCurrentWorkflowRuns(token, branch) {
  const { data: { workflows } } = await getOctokit(token).rest.actions.listRepoWorkflows({
    owner: context.repo.owner,
    repo: context.repo.repo
  });
  const workflow = workflows.find((workflow2) => workflow2.name === context.workflow);
  if (!workflow) {
    return [];
  }
  const { data: { workflow_runs } } = await getOctokit(token).rest.actions.listWorkflowRuns({
    owner: context.repo.owner,
    repo: context.repo.repo,
    workflow_id: workflow.id,
    branch,
    status: "completed"
  });
  return workflow_runs.filter((run) => run.conclusion === "success");
}

// dist/main.js
async function main() {
  const cwd = process.cwd();
  const token = getInput("github_token") || getInput("token");
  const workflowRunId = parseInt(getInput("github_run_id") || getInput("run_id"));
  const artifactClient = new DefaultArtifactClient();
  fs.mkdirSync(cwd, { recursive: true });
  info(`Current directory: ${cwd}`);
  const { artifacts } = await artifactClient.listArtifacts({
    findBy: {
      token,
      workflowRunId,
      repositoryOwner: context2.repo.owner,
      repositoryName: context2.repo.repo
    }
  });
  info(`Found ${artifacts.length} artifacts.`);
  debug(`Artifacts: ${JSON.stringify(artifacts, null, 4)}`);
  const rawPulls = {};
  const rawMetrics = {};
  for (const artifact of artifacts) {
    info(`Downloading artifact ${artifact.name}...`);
    let { downloadPath } = await artifactClient.downloadArtifact(artifact.id, {
      path: cwd,
      findBy: {
        token,
        workflowRunId,
        repositoryOwner: context2.repo.owner,
        repositoryName: context2.repo.repo
      }
    });
    downloadPath = path.join(downloadPath || cwd, artifact.name);
    info(`Downloaded artifact ${artifact.name} (${artifact.id}) to ${downloadPath}`);
    if (artifact.name.endsWith("-metrics.json")) {
      const workload = artifact.name.slice(0, -"-metrics.json".length);
      rawMetrics[workload] = fs.readFileSync(downloadPath, { encoding: "utf-8" });
    }
    if (artifact.name.endsWith("-pull.txt")) {
      const workload = artifact.name.slice(0, -"-pull.txt".length);
      rawPulls[workload] = fs.readFileSync(downloadPath, { encoding: "utf-8" });
    }
  }
  const pulls = {};
  const metrics = {};
  const reports = {};
  const comments = {};
  for (const [workload, value] of Object.entries(rawPulls)) {
    pulls[workload] = parseInt(value);
  }
  for (const [workload, value] of Object.entries(rawMetrics)) {
    metrics[workload] = JSON.parse(value);
  }
  for (const workload of Object.keys(pulls)) {
    const pull = pulls[workload];
    if (!pull) {
      continue;
    }
    info(`Getting comments for ${pull}...`);
    const { data } = await getOctokit2(token).rest.issues.listComments({
      issue_number: pull,
      owner: context2.repo.owner,
      repo: context2.repo.repo
    });
    info(`Got ${data.length} comments for ${pull}`);
    for (const comment of data) {
      if ((comment.body || comment.body_text || comment.body_html)?.includes(`Here are results of SLO test for ${workload}`)) {
        info(`Found comment for ${workload}: ${comment.html_url}`);
        comments[workload] = comment.id;
        break;
      }
    }
  }
  for (const workload of Object.keys(pulls)) {
    const pull = pulls[workload];
    if (!pull) {
      continue;
    }
    debug(`Pull request number: ${pull}`);
    info("Fetching information about pull request...");
    const { data: pr } = await getOctokit2(token).rest.pulls.get({
      owner: context2.repo.owner,
      repo: context2.repo.repo,
      pull_number: pull
    });
    info(`Pull request information fetched: ${pr.html_url}`);
    debug(`Pull request information: ${JSON.stringify(pr, null, 4)}`);
    info(`Fetching information about previous runs for base branch...`);
    const runs = await getCurrentWorkflowRuns(token, pr.base.ref);
    info(`Found ${runs.length} completed and successful runs for default branch.`);
    debug(`Previous runs for base branch: ${JSON.stringify(runs.map((run) => ({ id: run.id, upd: run.updated_at })), null, 4)}`);
    if (runs.length === 0) {
      warning("No previous runs found.");
      continue;
    }
    info(`Finding latest run...`);
    const latestRun = runs[0];
    info(`Latest run: ${latestRun.url}`);
    debug(`Latest run: ${JSON.stringify(latestRun, null, 4)}`);
    info(`Finding latest run artifacts...`);
    const { data: { artifacts: artifacts2 } } = await getOctokit2(token).rest.actions.listWorkflowRunArtifacts({
      owner: context2.repo.owner,
      repo: context2.repo.repo,
      run_id: latestRun.id
    });
    info(`Found ${artifacts2.length} artifacts.`);
    debug(`Latest run artifacts: ${JSON.stringify(artifacts2, null, 4)}`);
    const artifact = artifacts2.find((artifact2) => artifact2.name === `${workload}-metrics.json`);
    if (!artifact || artifact.expired) {
      warning("Metrics for base ref not found or expired.");
    } else {
      debug(`Metrics artifact: ${JSON.stringify(artifact, null, 4)}`);
      info(`Downloading artifact ${artifact.id}...`);
      let { downloadPath } = await artifactClient.downloadArtifact(artifact.id, {
        path: cwd,
        findBy: {
          token,
          workflowRunId: latestRun.workflow_id,
          repositoryOwner: context2.repo.owner,
          repositoryName: context2.repo.repo
        }
      });
      downloadPath ??= path.join(cwd, artifact.name);
      info(`Downloaded artifact ${artifact.id} to ${downloadPath}`);
      info(`Extracting metrics from artifact ${artifact.id}...`);
      const baseMetrics = JSON.parse(fs.readFileSync(downloadPath, { encoding: "utf-8" }));
      info(`Metrics extracted from artifact ${artifact.id}: ${Object.keys(baseMetrics)}`);
      debug(`Base metrics: ${JSON.stringify(baseMetrics, null, 4)}`);
      info(`Merging metrics...`);
      for (const [name, baseSeries] of Object.entries(baseMetrics)) {
        if (!metrics[workload][name])
          continue;
        metrics[workload][name] = metrics[workload][name].concat(baseSeries);
      }
    }
  }
  for (const workload of Object.keys(metrics)) {
    if (!metrics[workload]) {
      continue;
    }
    info("Rendering report...");
    const report = await renderReport(metrics[workload]);
    debug(`Report: ${report}`);
    reports[workload] = report;
  }
  for (const workload of Object.keys(pulls)) {
    const pull = pulls[workload];
    const report = reports[workload];
    const commentId = comments[workload];
    if (!report) {
      continue;
    }
    if (commentId) {
      info(`Updating report for ${pull}...`);
      const { data } = await getOctokit2(token).rest.issues.updateComment({
        comment_id: commentId,
        owner: context2.repo.owner,
        repo: context2.repo.repo,
        body: report
      });
      info(`Report for was ${pull} updated: ${data.html_url}`);
    } else {
      info(`Creating report for ${pull}...`);
      const { data } = await getOctokit2(token).rest.issues.createComment({
        issue_number: pull,
        owner: context2.repo.owner,
        repo: context2.repo.repo,
        body: report
      });
      info(`Report for ${pull} created: ${data.html_url}`);
    }
  }
}
main();
