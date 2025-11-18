import {
  generateHTMLReport
} from "./lib/html.js";
import {
  writeJobSummary
} from "./lib/summary.js";
import {
  downloadWorkloadArtifacts
} from "./lib/artifacts.js";
import"./lib/events.js";
import {
  require_artifact
} from "../main-1jw8rte1.js";
import {
  createWorkloadCheck
} from "./lib/checks.js";
import {
  compareWorkloadMetrics
} from "./lib/analysis.js";
import"./lib/metrics.js";
import {
  createOrUpdateComment,
  generateCommentBody
} from "./lib/comment.js";
import {
  require_github
} from "../github-jgav07sj.js";
import {
  require_core
} from "../main-d15da32k.js";
import"../main-2h1wxd0e.js";
import"../main-zqznhazw.js";
import"../main-c7r720rd.js";
import {
  __require,
  __toESM
} from "../main-ynsbc1hx.js";

// report/main.ts
var import_artifact = __toESM(require_artifact(), 1), import_core = __toESM(require_core(), 1), import_github = __toESM(require_github(), 1);
import * as fs from "node:fs";
import * as path from "node:path";
async function main() {
  try {
    let cwd = path.join(process.cwd(), ".slo-reports"), token = import_core.getInput("github_token") || import_core.getInput("token"), runId = parseInt(import_core.getInput("github_run_id") || import_core.getInput("run_id") || String(import_github.context.runId));
    if (!token) {
      import_core.setFailed("github_token is required");
      return;
    }
    fs.mkdirSync(cwd, { recursive: !0 }), import_core.info(`Working directory: ${cwd}`), import_core.info("\uD83D\uDCE6 Downloading artifacts from current run...");
    let workloads = await downloadWorkloadArtifacts({
      token,
      workflowRunId: runId,
      repositoryOwner: import_github.context.repo.owner,
      repositoryName: import_github.context.repo.repo,
      downloadPath: cwd
    });
    if (workloads.length === 0) {
      import_core.warning("No workload artifacts found in current run");
      return;
    }
    import_core.info(`Found ${workloads.length} workloads: ${workloads.map((w) => w.workload).join(", ")}`);
    let prNumber = workloads[0]?.pullNumber;
    if (!prNumber) {
      import_core.setFailed("Pull request number not found in artifacts");
      return;
    }
    import_core.info(`Processing PR #${prNumber}`);
    let { getOctokit } = await import("../github-jgav07sj.js"), octokit = getOctokit(token);
    import_core.info("Fetching PR information...");
    let { data: pr } = await octokit.rest.pulls.get({
      owner: import_github.context.repo.owner,
      repo: import_github.context.repo.repo,
      pull_number: prNumber
    });
    import_core.info(`PR: ${pr.title}`), import_core.info(`Base branch: ${pr.base.ref}`), import_core.info(`Head SHA: ${pr.head.sha}`), import_core.info("\uD83D\uDCCA Analyzing metrics...");
    let comparisons = workloads.map((w) => compareWorkloadMetrics(w.workload, w.metrics));
    import_core.info("\uD83D\uDCDD Generating HTML reports...");
    let htmlReportsPath = path.join(cwd, "reports");
    fs.mkdirSync(htmlReportsPath, { recursive: !0 });
    let htmlFiles = [];
    for (let i = 0;i < workloads.length; i++) {
      let workload = workloads[i], comparison = comparisons[i], htmlData = {
        workload: workload.workload,
        comparison,
        metrics: workload.metrics,
        events: workload.events,
        commits: {
          current: {
            sha: pr.head.sha,
            url: `https://github.com/${import_github.context.repo.owner}/${import_github.context.repo.repo}/commit/${pr.head.sha}`,
            short: pr.head.sha.substring(0, 7)
          },
          base: {
            sha: pr.base.sha,
            url: `https://github.com/${import_github.context.repo.owner}/${import_github.context.repo.repo}/commit/${pr.base.sha}`,
            short: pr.base.sha.substring(0, 7)
          }
        },
        meta: {
          prNumber,
          generatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      }, html = generateHTMLReport(htmlData), htmlPath = path.join(htmlReportsPath, `${workload.workload}-report.html`);
      fs.writeFileSync(htmlPath, html, { encoding: "utf-8" }), htmlFiles.push({ workload: workload.workload, path: htmlPath }), import_core.info(`Generated HTML report for ${workload.workload}`);
    }
    import_core.info("\uD83D\uDCE4 Uploading HTML reports...");
    let uploadResult = await new import_artifact.DefaultArtifactClient().uploadArtifact("slo-reports", htmlFiles.map((f) => f.path), htmlReportsPath, {
      retentionDays: 30
    });
    import_core.info(`Uploaded HTML reports as artifact: ${uploadResult.id}`), import_core.info("✅ Creating GitHub Checks...");
    let checkUrls = /* @__PURE__ */ new Map;
    for (let comparison of comparisons)
      try {
        let check = await createWorkloadCheck({
          token,
          owner: import_github.context.repo.owner,
          repo: import_github.context.repo.repo,
          sha: pr.head.sha,
          workload: comparison
        });
        checkUrls.set(comparison.workload, check.url), import_core.info(`Created check for ${comparison.workload}: ${check.url}`);
      } catch (error) {
        import_core.warning(`Failed to create check for ${comparison.workload}: ${String(error)}`);
      }
    import_core.info("\uD83D\uDCCB Writing Job Summary..."), await writeJobSummary({
      workloads: comparisons,
      commits: {
        current: {
          sha: pr.head.sha,
          url: `https://github.com/${import_github.context.repo.owner}/${import_github.context.repo.repo}/commit/${pr.head.sha}`,
          short: pr.head.sha.substring(0, 7)
        },
        base: {
          sha: pr.base.sha,
          url: `https://github.com/${import_github.context.repo.owner}/${import_github.context.repo.repo}/commit/${pr.base.sha}`,
          short: pr.base.sha.substring(0, 7)
        }
      }
    }), import_core.info("Job Summary written"), import_core.info("\uD83D\uDCAC Creating/updating PR comment...");
    let artifactUrls = /* @__PURE__ */ new Map, artifactBaseUrl = `https://github.com/${import_github.context.repo.owner}/${import_github.context.repo.repo}/actions/runs/${runId}/artifacts/${uploadResult.id}`;
    for (let file of htmlFiles)
      artifactUrls.set(file.workload, artifactBaseUrl);
    let commentBody = generateCommentBody({
      workloads: comparisons,
      artifactUrls,
      checkUrls,
      jobSummaryUrl: `https://github.com/${import_github.context.repo.owner}/${import_github.context.repo.repo}/actions/runs/${runId}`
    }), comment = await createOrUpdateComment(token, import_github.context.repo.owner, import_github.context.repo.repo, prNumber, commentBody);
    import_core.info(`PR comment: ${comment.url}`), import_core.info("✅ Report generation completed successfully!");
  } catch (error) {
    throw import_core.setFailed(`Report generation failed: ${String(error)}`), error;
  }
}
main();

//# debugId=004244991272C4F164756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vcmVwb3J0L21haW4udHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbCiAgICAiLyoqXG4gKiBTTE8gUmVwb3J0IEFjdGlvbiAtIE1haW4gT3JjaGVzdHJhdG9yXG4gKi9cblxuaW1wb3J0ICogYXMgZnMgZnJvbSAnbm9kZTpmcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJ1xuXG5pbXBvcnQgeyBEZWZhdWx0QXJ0aWZhY3RDbGllbnQgfSBmcm9tICdAYWN0aW9ucy9hcnRpZmFjdCdcbmltcG9ydCB7IGdldElucHV0LCBpbmZvLCBzZXRGYWlsZWQsIHdhcm5pbmcgfSBmcm9tICdAYWN0aW9ucy9jb3JlJ1xuaW1wb3J0IHsgY29udGV4dCB9IGZyb20gJ0BhY3Rpb25zL2dpdGh1YidcblxuaW1wb3J0IHsgY29tcGFyZVdvcmtsb2FkTWV0cmljcyB9IGZyb20gJy4vbGliL2FuYWx5c2lzLmpzJ1xuaW1wb3J0IHsgZG93bmxvYWRXb3JrbG9hZEFydGlmYWN0cyB9IGZyb20gJy4vbGliL2FydGlmYWN0cy5qcydcbmltcG9ydCB7IGNyZWF0ZVdvcmtsb2FkQ2hlY2sgfSBmcm9tICcuL2xpYi9jaGVja3MuanMnXG5pbXBvcnQgeyBjcmVhdGVPclVwZGF0ZUNvbW1lbnQsIGdlbmVyYXRlQ29tbWVudEJvZHkgfSBmcm9tICcuL2xpYi9jb21tZW50LmpzJ1xuaW1wb3J0IHsgZ2VuZXJhdGVIVE1MUmVwb3J0LCB0eXBlIEhUTUxSZXBvcnREYXRhIH0gZnJvbSAnLi9saWIvaHRtbC5qcydcbmltcG9ydCB7IHdyaXRlSm9iU3VtbWFyeSB9IGZyb20gJy4vbGliL3N1bW1hcnkuanMnXG5cbmFzeW5jIGZ1bmN0aW9uIG1haW4oKSB7XG5cdHRyeSB7XG5cdFx0bGV0IGN3ZCA9IHBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCAnLnNsby1yZXBvcnRzJylcblx0XHRsZXQgdG9rZW4gPSBnZXRJbnB1dCgnZ2l0aHViX3Rva2VuJykgfHwgZ2V0SW5wdXQoJ3Rva2VuJylcblx0XHRsZXQgcnVuSWQgPSBwYXJzZUludChnZXRJbnB1dCgnZ2l0aHViX3J1bl9pZCcpIHx8IGdldElucHV0KCdydW5faWQnKSB8fCBTdHJpbmcoY29udGV4dC5ydW5JZCkpXG5cblx0XHRpZiAoIXRva2VuKSB7XG5cdFx0XHRzZXRGYWlsZWQoJ2dpdGh1Yl90b2tlbiBpcyByZXF1aXJlZCcpXG5cdFx0XHRyZXR1cm5cblx0XHR9XG5cblx0XHRmcy5ta2RpclN5bmMoY3dkLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KVxuXHRcdGluZm8oYFdvcmtpbmcgZGlyZWN0b3J5OiAke2N3ZH1gKVxuXG5cdFx0Ly8gU3RlcCAxOiBEb3dubG9hZCBhcnRpZmFjdHMgZnJvbSBjdXJyZW50IHJ1blxuXHRcdC8vIE5PVEU6IEFydGlmYWN0cyBhbHJlYWR5IGNvbnRhaW4gYm90aCBjdXJyZW50IGFuZCBiYXNlIHNlcmllcyAoY29sbGVjdGVkIGluIGluaXQgYWN0aW9uKVxuXHRcdGluZm8oJ/Cfk6YgRG93bmxvYWRpbmcgYXJ0aWZhY3RzIGZyb20gY3VycmVudCBydW4uLi4nKVxuXHRcdGxldCB3b3JrbG9hZHMgPSBhd2FpdCBkb3dubG9hZFdvcmtsb2FkQXJ0aWZhY3RzKHtcblx0XHRcdHRva2VuLFxuXHRcdFx0d29ya2Zsb3dSdW5JZDogcnVuSWQsXG5cdFx0XHRyZXBvc2l0b3J5T3duZXI6IGNvbnRleHQucmVwby5vd25lcixcblx0XHRcdHJlcG9zaXRvcnlOYW1lOiBjb250ZXh0LnJlcG8ucmVwbyxcblx0XHRcdGRvd25sb2FkUGF0aDogY3dkLFxuXHRcdH0pXG5cblx0XHRpZiAod29ya2xvYWRzLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0d2FybmluZygnTm8gd29ya2xvYWQgYXJ0aWZhY3RzIGZvdW5kIGluIGN1cnJlbnQgcnVuJylcblx0XHRcdHJldHVyblxuXHRcdH1cblxuXHRcdGluZm8oYEZvdW5kICR7d29ya2xvYWRzLmxlbmd0aH0gd29ya2xvYWRzOiAke3dvcmtsb2Fkcy5tYXAoKHcpID0+IHcud29ya2xvYWQpLmpvaW4oJywgJyl9YClcblxuXHRcdC8vIFN0ZXAgMjogR2V0IFBSIGluZm9ybWF0aW9uXG5cdFx0bGV0IHByTnVtYmVyID0gd29ya2xvYWRzWzBdPy5wdWxsTnVtYmVyXG5cdFx0aWYgKCFwck51bWJlcikge1xuXHRcdFx0c2V0RmFpbGVkKCdQdWxsIHJlcXVlc3QgbnVtYmVyIG5vdCBmb3VuZCBpbiBhcnRpZmFjdHMnKVxuXHRcdFx0cmV0dXJuXG5cdFx0fVxuXG5cdFx0aW5mbyhgUHJvY2Vzc2luZyBQUiAjJHtwck51bWJlcn1gKVxuXG5cdFx0Ly8gR2V0IFBSIGRldGFpbHMgZm9yIGNvbW1pdCBpbmZvXG5cdFx0bGV0IHsgZ2V0T2N0b2tpdCB9ID0gYXdhaXQgaW1wb3J0KCdAYWN0aW9ucy9naXRodWInKVxuXHRcdGxldCBvY3Rva2l0ID0gZ2V0T2N0b2tpdCh0b2tlbilcblxuXHRcdGluZm8oJ0ZldGNoaW5nIFBSIGluZm9ybWF0aW9uLi4uJylcblx0XHRsZXQgeyBkYXRhOiBwciB9ID0gYXdhaXQgb2N0b2tpdC5yZXN0LnB1bGxzLmdldCh7XG5cdFx0XHRvd25lcjogY29udGV4dC5yZXBvLm93bmVyLFxuXHRcdFx0cmVwbzogY29udGV4dC5yZXBvLnJlcG8sXG5cdFx0XHRwdWxsX251bWJlcjogcHJOdW1iZXIsXG5cdFx0fSlcblxuXHRcdGluZm8oYFBSOiAke3ByLnRpdGxlfWApXG5cdFx0aW5mbyhgQmFzZSBicmFuY2g6ICR7cHIuYmFzZS5yZWZ9YClcblx0XHRpbmZvKGBIZWFkIFNIQTogJHtwci5oZWFkLnNoYX1gKVxuXG5cdFx0Ly8gU3RlcCAzOiBBbmFseXplIG1ldHJpY3MgKGFscmVhZHkgY29udGFpbiBjdXJyZW50IGFuZCBiYXNlIHNlcmllcyB3aXRoIHJlZiBsYWJlbClcblx0XHRpbmZvKCfwn5OKIEFuYWx5emluZyBtZXRyaWNzLi4uJylcblx0XHRsZXQgY29tcGFyaXNvbnMgPSB3b3JrbG9hZHMubWFwKCh3KSA9PiBjb21wYXJlV29ya2xvYWRNZXRyaWNzKHcud29ya2xvYWQsIHcubWV0cmljcykpXG5cblx0XHQvLyBTdGVwIDQ6IEdlbmVyYXRlIEhUTUwgcmVwb3J0c1xuXHRcdGluZm8oJ/Cfk50gR2VuZXJhdGluZyBIVE1MIHJlcG9ydHMuLi4nKVxuXG5cdFx0bGV0IGh0bWxSZXBvcnRzUGF0aCA9IHBhdGguam9pbihjd2QsICdyZXBvcnRzJylcblx0XHRmcy5ta2RpclN5bmMoaHRtbFJlcG9ydHNQYXRoLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KVxuXG5cdFx0bGV0IGh0bWxGaWxlczogQXJyYXk8eyB3b3JrbG9hZDogc3RyaW5nOyBwYXRoOiBzdHJpbmcgfT4gPSBbXVxuXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB3b3JrbG9hZHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdGxldCB3b3JrbG9hZCA9IHdvcmtsb2Fkc1tpXVxuXHRcdFx0bGV0IGNvbXBhcmlzb24gPSBjb21wYXJpc29uc1tpXVxuXG5cdFx0XHRsZXQgaHRtbERhdGE6IEhUTUxSZXBvcnREYXRhID0ge1xuXHRcdFx0XHR3b3JrbG9hZDogd29ya2xvYWQud29ya2xvYWQsXG5cdFx0XHRcdGNvbXBhcmlzb24sXG5cdFx0XHRcdG1ldHJpY3M6IHdvcmtsb2FkLm1ldHJpY3MsXG5cdFx0XHRcdGV2ZW50czogd29ya2xvYWQuZXZlbnRzLFxuXHRcdFx0XHRjb21taXRzOiB7XG5cdFx0XHRcdFx0Y3VycmVudDoge1xuXHRcdFx0XHRcdFx0c2hhOiBwci5oZWFkLnNoYSxcblx0XHRcdFx0XHRcdHVybDogYGh0dHBzOi8vZ2l0aHViLmNvbS8ke2NvbnRleHQucmVwby5vd25lcn0vJHtjb250ZXh0LnJlcG8ucmVwb30vY29tbWl0LyR7cHIuaGVhZC5zaGF9YCxcblx0XHRcdFx0XHRcdHNob3J0OiBwci5oZWFkLnNoYS5zdWJzdHJpbmcoMCwgNyksXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRiYXNlOiB7XG5cdFx0XHRcdFx0XHRzaGE6IHByLmJhc2Uuc2hhLFxuXHRcdFx0XHRcdFx0dXJsOiBgaHR0cHM6Ly9naXRodWIuY29tLyR7Y29udGV4dC5yZXBvLm93bmVyfS8ke2NvbnRleHQucmVwby5yZXBvfS9jb21taXQvJHtwci5iYXNlLnNoYX1gLFxuXHRcdFx0XHRcdFx0c2hvcnQ6IHByLmJhc2Uuc2hhLnN1YnN0cmluZygwLCA3KSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRtZXRhOiB7XG5cdFx0XHRcdFx0cHJOdW1iZXIsXG5cdFx0XHRcdFx0Z2VuZXJhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcblx0XHRcdFx0fSxcblx0XHRcdH1cblxuXHRcdFx0bGV0IGh0bWwgPSBnZW5lcmF0ZUhUTUxSZXBvcnQoaHRtbERhdGEpXG5cdFx0XHRsZXQgaHRtbFBhdGggPSBwYXRoLmpvaW4oaHRtbFJlcG9ydHNQYXRoLCBgJHt3b3JrbG9hZC53b3JrbG9hZH0tcmVwb3J0Lmh0bWxgKVxuXG5cdFx0XHRmcy53cml0ZUZpbGVTeW5jKGh0bWxQYXRoLCBodG1sLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pXG5cdFx0XHRodG1sRmlsZXMucHVzaCh7IHdvcmtsb2FkOiB3b3JrbG9hZC53b3JrbG9hZCwgcGF0aDogaHRtbFBhdGggfSlcblxuXHRcdFx0aW5mbyhgR2VuZXJhdGVkIEhUTUwgcmVwb3J0IGZvciAke3dvcmtsb2FkLndvcmtsb2FkfWApXG5cdFx0fVxuXG5cdFx0Ly8gU3RlcCA1OiBVcGxvYWQgSFRNTCByZXBvcnRzIGFzIGFydGlmYWN0c1xuXHRcdGluZm8oJ/Cfk6QgVXBsb2FkaW5nIEhUTUwgcmVwb3J0cy4uLicpXG5cblx0XHRsZXQgYXJ0aWZhY3RDbGllbnQgPSBuZXcgRGVmYXVsdEFydGlmYWN0Q2xpZW50KClcblx0XHRsZXQgdXBsb2FkUmVzdWx0ID0gYXdhaXQgYXJ0aWZhY3RDbGllbnQudXBsb2FkQXJ0aWZhY3QoXG5cdFx0XHQnc2xvLXJlcG9ydHMnLFxuXHRcdFx0aHRtbEZpbGVzLm1hcCgoZikgPT4gZi5wYXRoKSxcblx0XHRcdGh0bWxSZXBvcnRzUGF0aCxcblx0XHRcdHtcblx0XHRcdFx0cmV0ZW50aW9uRGF5czogMzAsXG5cdFx0XHR9XG5cdFx0KVxuXG5cdFx0aW5mbyhgVXBsb2FkZWQgSFRNTCByZXBvcnRzIGFzIGFydGlmYWN0OiAke3VwbG9hZFJlc3VsdC5pZH1gKVxuXG5cdFx0Ly8gU3RlcCA2OiBDcmVhdGUgR2l0SHViIENoZWNrc1xuXHRcdGluZm8oJ+KchSBDcmVhdGluZyBHaXRIdWIgQ2hlY2tzLi4uJylcblxuXHRcdGxldCBjaGVja1VybHMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpXG5cblx0XHRmb3IgKGxldCBjb21wYXJpc29uIG9mIGNvbXBhcmlzb25zKSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRsZXQgY2hlY2sgPSBhd2FpdCBjcmVhdGVXb3JrbG9hZENoZWNrKHtcblx0XHRcdFx0XHR0b2tlbixcblx0XHRcdFx0XHRvd25lcjogY29udGV4dC5yZXBvLm93bmVyLFxuXHRcdFx0XHRcdHJlcG86IGNvbnRleHQucmVwby5yZXBvLFxuXHRcdFx0XHRcdHNoYTogcHIuaGVhZC5zaGEsXG5cdFx0XHRcdFx0d29ya2xvYWQ6IGNvbXBhcmlzb24sXG5cdFx0XHRcdH0pXG5cblx0XHRcdFx0Y2hlY2tVcmxzLnNldChjb21wYXJpc29uLndvcmtsb2FkLCBjaGVjay51cmwpXG5cdFx0XHRcdGluZm8oYENyZWF0ZWQgY2hlY2sgZm9yICR7Y29tcGFyaXNvbi53b3JrbG9hZH06ICR7Y2hlY2sudXJsfWApXG5cdFx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0XHR3YXJuaW5nKGBGYWlsZWQgdG8gY3JlYXRlIGNoZWNrIGZvciAke2NvbXBhcmlzb24ud29ya2xvYWR9OiAke1N0cmluZyhlcnJvcil9YClcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBTdGVwIDc6IFdyaXRlIEpvYiBTdW1tYXJ5XG5cdFx0aW5mbygn8J+TiyBXcml0aW5nIEpvYiBTdW1tYXJ5Li4uJylcblxuXHRcdGF3YWl0IHdyaXRlSm9iU3VtbWFyeSh7XG5cdFx0XHR3b3JrbG9hZHM6IGNvbXBhcmlzb25zLFxuXHRcdFx0Y29tbWl0czoge1xuXHRcdFx0XHRjdXJyZW50OiB7XG5cdFx0XHRcdFx0c2hhOiBwci5oZWFkLnNoYSxcblx0XHRcdFx0XHR1cmw6IGBodHRwczovL2dpdGh1Yi5jb20vJHtjb250ZXh0LnJlcG8ub3duZXJ9LyR7Y29udGV4dC5yZXBvLnJlcG99L2NvbW1pdC8ke3ByLmhlYWQuc2hhfWAsXG5cdFx0XHRcdFx0c2hvcnQ6IHByLmhlYWQuc2hhLnN1YnN0cmluZygwLCA3KSxcblx0XHRcdFx0fSxcblx0XHRcdFx0YmFzZToge1xuXHRcdFx0XHRcdHNoYTogcHIuYmFzZS5zaGEsXG5cdFx0XHRcdFx0dXJsOiBgaHR0cHM6Ly9naXRodWIuY29tLyR7Y29udGV4dC5yZXBvLm93bmVyfS8ke2NvbnRleHQucmVwby5yZXBvfS9jb21taXQvJHtwci5iYXNlLnNoYX1gLFxuXHRcdFx0XHRcdHNob3J0OiBwci5iYXNlLnNoYS5zdWJzdHJpbmcoMCwgNyksXG5cdFx0XHRcdH0sXG5cdFx0XHR9LFxuXHRcdH0pXG5cblx0XHRpbmZvKCdKb2IgU3VtbWFyeSB3cml0dGVuJylcblxuXHRcdC8vIFN0ZXAgODogQ3JlYXRlL1VwZGF0ZSBQUiBjb21tZW50XG5cdFx0aW5mbygn8J+SrCBDcmVhdGluZy91cGRhdGluZyBQUiBjb21tZW50Li4uJylcblxuXHRcdC8vIEFydGlmYWN0IFVSTHMgKEdpdEh1YiBVSSBkb3dubG9hZClcblx0XHRsZXQgYXJ0aWZhY3RVcmxzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKVxuXHRcdGxldCBhcnRpZmFjdEJhc2VVcmwgPSBgaHR0cHM6Ly9naXRodWIuY29tLyR7Y29udGV4dC5yZXBvLm93bmVyfS8ke2NvbnRleHQucmVwby5yZXBvfS9hY3Rpb25zL3J1bnMvJHtydW5JZH0vYXJ0aWZhY3RzLyR7dXBsb2FkUmVzdWx0LmlkfWBcblxuXHRcdGZvciAobGV0IGZpbGUgb2YgaHRtbEZpbGVzKSB7XG5cdFx0XHRhcnRpZmFjdFVybHMuc2V0KGZpbGUud29ya2xvYWQsIGFydGlmYWN0QmFzZVVybClcblx0XHR9XG5cblx0XHRsZXQgY29tbWVudEJvZHkgPSBnZW5lcmF0ZUNvbW1lbnRCb2R5KHtcblx0XHRcdHdvcmtsb2FkczogY29tcGFyaXNvbnMsXG5cdFx0XHRhcnRpZmFjdFVybHMsXG5cdFx0XHRjaGVja1VybHMsXG5cdFx0XHRqb2JTdW1tYXJ5VXJsOiBgaHR0cHM6Ly9naXRodWIuY29tLyR7Y29udGV4dC5yZXBvLm93bmVyfS8ke2NvbnRleHQucmVwby5yZXBvfS9hY3Rpb25zL3J1bnMvJHtydW5JZH1gLFxuXHRcdH0pXG5cblx0XHRsZXQgY29tbWVudCA9IGF3YWl0IGNyZWF0ZU9yVXBkYXRlQ29tbWVudCh0b2tlbiwgY29udGV4dC5yZXBvLm93bmVyLCBjb250ZXh0LnJlcG8ucmVwbywgcHJOdW1iZXIsIGNvbW1lbnRCb2R5KVxuXG5cdFx0aW5mbyhgUFIgY29tbWVudDogJHtjb21tZW50LnVybH1gKVxuXG5cdFx0aW5mbygn4pyFIFJlcG9ydCBnZW5lcmF0aW9uIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkhJylcblx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRzZXRGYWlsZWQoYFJlcG9ydCBnZW5lcmF0aW9uIGZhaWxlZDogJHtTdHJpbmcoZXJyb3IpfWApXG5cdFx0dGhyb3cgZXJyb3Jcblx0fVxufVxuXG5tYWluKClcbiIKICBdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQU9BLHNEQUNBLDBDQUNBO0FBTEE7QUFDQTtBQWFBLGVBQWUsSUFBSSxHQUFHO0FBQUEsRUFDckIsSUFBSTtBQUFBLElBQ0gsSUFBSSxNQUFXLFVBQUssUUFBUSxJQUFJLEdBQUcsY0FBYyxHQUM3QyxRQUFRLHFCQUFTLGNBQWMsS0FBSyxxQkFBUyxPQUFPLEdBQ3BELFFBQVEsU0FBUyxxQkFBUyxlQUFlLEtBQUsscUJBQVMsUUFBUSxLQUFLLE9BQU8sc0JBQVEsS0FBSyxDQUFDO0FBQUEsSUFFN0YsSUFBSSxDQUFDLE9BQU87QUFBQSxNQUNYLHNCQUFVLDBCQUEwQjtBQUFBLE1BQ3BDO0FBQUE7QUFBQSxJQUdFLGFBQVUsS0FBSyxFQUFFLFdBQVcsR0FBSyxDQUFDLEdBQ3JDLGlCQUFLLHNCQUFzQixLQUFLLEdBSWhDLGlCQUFLLHdEQUE2QztBQUFBLElBQ2xELElBQUksWUFBWSxNQUFNLDBCQUEwQjtBQUFBLE1BQy9DO0FBQUEsTUFDQSxlQUFlO0FBQUEsTUFDZixpQkFBaUIsc0JBQVEsS0FBSztBQUFBLE1BQzlCLGdCQUFnQixzQkFBUSxLQUFLO0FBQUEsTUFDN0IsY0FBYztBQUFBLElBQ2YsQ0FBQztBQUFBLElBRUQsSUFBSSxVQUFVLFdBQVcsR0FBRztBQUFBLE1BQzNCLG9CQUFRLDRDQUE0QztBQUFBLE1BQ3BEO0FBQUE7QUFBQSxJQUdELGlCQUFLLFNBQVMsVUFBVSxxQkFBcUIsVUFBVSxJQUFJLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxLQUFLLElBQUksR0FBRztBQUFBLElBRzFGLElBQUksV0FBVyxVQUFVLElBQUk7QUFBQSxJQUM3QixJQUFJLENBQUMsVUFBVTtBQUFBLE1BQ2Qsc0JBQVUsNENBQTRDO0FBQUEsTUFDdEQ7QUFBQTtBQUFBLElBR0QsaUJBQUssa0JBQWtCLFVBQVU7QUFBQSxJQUdqQyxNQUFNLGVBQWUsTUFBYSxpQ0FDOUIsVUFBVSxXQUFXLEtBQUs7QUFBQSxJQUU5QixpQkFBSyw0QkFBNEI7QUFBQSxJQUNqQyxNQUFNLE1BQU0sT0FBTyxNQUFNLFFBQVEsS0FBSyxNQUFNLElBQUk7QUFBQSxNQUMvQyxPQUFPLHNCQUFRLEtBQUs7QUFBQSxNQUNwQixNQUFNLHNCQUFRLEtBQUs7QUFBQSxNQUNuQixhQUFhO0FBQUEsSUFDZCxDQUFDO0FBQUEsSUFFRCxpQkFBSyxPQUFPLEdBQUcsT0FBTyxHQUN0QixpQkFBSyxnQkFBZ0IsR0FBRyxLQUFLLEtBQUssR0FDbEMsaUJBQUssYUFBYSxHQUFHLEtBQUssS0FBSyxHQUcvQixpQkFBSyxtQ0FBd0I7QUFBQSxJQUM3QixJQUFJLGNBQWMsVUFBVSxJQUFJLENBQUMsTUFBTSx1QkFBdUIsRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDO0FBQUEsSUFHcEYsaUJBQUsseUNBQThCO0FBQUEsSUFFbkMsSUFBSSxrQkFBdUIsVUFBSyxLQUFLLFNBQVM7QUFBQSxJQUMzQyxhQUFVLGlCQUFpQixFQUFFLFdBQVcsR0FBSyxDQUFDO0FBQUEsSUFFakQsSUFBSSxZQUF1RCxDQUFDO0FBQUEsSUFFNUQsU0FBUyxJQUFJLEVBQUcsSUFBSSxVQUFVLFFBQVEsS0FBSztBQUFBLE1BQzFDLElBQUksV0FBVyxVQUFVLElBQ3JCLGFBQWEsWUFBWSxJQUV6QixXQUEyQjtBQUFBLFFBQzlCLFVBQVUsU0FBUztBQUFBLFFBQ25CO0FBQUEsUUFDQSxTQUFTLFNBQVM7QUFBQSxRQUNsQixRQUFRLFNBQVM7QUFBQSxRQUNqQixTQUFTO0FBQUEsVUFDUixTQUFTO0FBQUEsWUFDUixLQUFLLEdBQUcsS0FBSztBQUFBLFlBQ2IsS0FBSyxzQkFBc0Isc0JBQVEsS0FBSyxTQUFTLHNCQUFRLEtBQUssZUFBZSxHQUFHLEtBQUs7QUFBQSxZQUNyRixPQUFPLEdBQUcsS0FBSyxJQUFJLFVBQVUsR0FBRyxDQUFDO0FBQUEsVUFDbEM7QUFBQSxVQUNBLE1BQU07QUFBQSxZQUNMLEtBQUssR0FBRyxLQUFLO0FBQUEsWUFDYixLQUFLLHNCQUFzQixzQkFBUSxLQUFLLFNBQVMsc0JBQVEsS0FBSyxlQUFlLEdBQUcsS0FBSztBQUFBLFlBQ3JGLE9BQU8sR0FBRyxLQUFLLElBQUksVUFBVSxHQUFHLENBQUM7QUFBQSxVQUNsQztBQUFBLFFBQ0Q7QUFBQSxRQUNBLE1BQU07QUFBQSxVQUNMO0FBQUEsVUFDQSw4QkFBYSxJQUFJLEtBQUssR0FBRSxZQUFZO0FBQUEsUUFDckM7QUFBQSxNQUNELEdBRUksT0FBTyxtQkFBbUIsUUFBUSxHQUNsQyxXQUFnQixVQUFLLGlCQUFpQixHQUFHLFNBQVMsc0JBQXNCO0FBQUEsTUFFekUsaUJBQWMsVUFBVSxNQUFNLEVBQUUsVUFBVSxRQUFRLENBQUMsR0FDdEQsVUFBVSxLQUFLLEVBQUUsVUFBVSxTQUFTLFVBQVUsTUFBTSxTQUFTLENBQUMsR0FFOUQsaUJBQUssNkJBQTZCLFNBQVMsVUFBVTtBQUFBO0FBQUEsSUFJdEQsaUJBQUssd0NBQTZCO0FBQUEsSUFHbEMsSUFBSSxlQUFlLE1BREUsSUFBSSxzQ0FBc0IsRUFDUCxlQUN2QyxlQUNBLFVBQVUsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLEdBQzNCLGlCQUNBO0FBQUEsTUFDQyxlQUFlO0FBQUEsSUFDaEIsQ0FDRDtBQUFBLElBRUEsaUJBQUssc0NBQXNDLGFBQWEsSUFBSSxHQUc1RCxpQkFBSyw2QkFBNEI7QUFBQSxJQUVqQyxJQUFJLDRCQUFZLElBQUk7QUFBQSxJQUVwQixTQUFTLGNBQWM7QUFBQSxNQUN0QixJQUFJO0FBQUEsUUFDSCxJQUFJLFFBQVEsTUFBTSxvQkFBb0I7QUFBQSxVQUNyQztBQUFBLFVBQ0EsT0FBTyxzQkFBUSxLQUFLO0FBQUEsVUFDcEIsTUFBTSxzQkFBUSxLQUFLO0FBQUEsVUFDbkIsS0FBSyxHQUFHLEtBQUs7QUFBQSxVQUNiLFVBQVU7QUFBQSxRQUNYLENBQUM7QUFBQSxRQUVELFVBQVUsSUFBSSxXQUFXLFVBQVUsTUFBTSxHQUFHLEdBQzVDLGlCQUFLLHFCQUFxQixXQUFXLGFBQWEsTUFBTSxLQUFLO0FBQUEsUUFDNUQsT0FBTyxPQUFPO0FBQUEsUUFDZixvQkFBUSw4QkFBOEIsV0FBVyxhQUFhLE9BQU8sS0FBSyxHQUFHO0FBQUE7QUFBQSxJQUsvRSxpQkFBSyxxQ0FBMEIsR0FFL0IsTUFBTSxnQkFBZ0I7QUFBQSxNQUNyQixXQUFXO0FBQUEsTUFDWCxTQUFTO0FBQUEsUUFDUixTQUFTO0FBQUEsVUFDUixLQUFLLEdBQUcsS0FBSztBQUFBLFVBQ2IsS0FBSyxzQkFBc0Isc0JBQVEsS0FBSyxTQUFTLHNCQUFRLEtBQUssZUFBZSxHQUFHLEtBQUs7QUFBQSxVQUNyRixPQUFPLEdBQUcsS0FBSyxJQUFJLFVBQVUsR0FBRyxDQUFDO0FBQUEsUUFDbEM7QUFBQSxRQUNBLE1BQU07QUFBQSxVQUNMLEtBQUssR0FBRyxLQUFLO0FBQUEsVUFDYixLQUFLLHNCQUFzQixzQkFBUSxLQUFLLFNBQVMsc0JBQVEsS0FBSyxlQUFlLEdBQUcsS0FBSztBQUFBLFVBQ3JGLE9BQU8sR0FBRyxLQUFLLElBQUksVUFBVSxHQUFHLENBQUM7QUFBQSxRQUNsQztBQUFBLE1BQ0Q7QUFBQSxJQUNELENBQUMsR0FFRCxpQkFBSyxxQkFBcUIsR0FHMUIsaUJBQUssOENBQW1DO0FBQUEsSUFHeEMsSUFBSSwrQkFBZSxJQUFJLEtBQ25CLGtCQUFrQixzQkFBc0Isc0JBQVEsS0FBSyxTQUFTLHNCQUFRLEtBQUsscUJBQXFCLG1CQUFtQixhQUFhO0FBQUEsSUFFcEksU0FBUyxRQUFRO0FBQUEsTUFDaEIsYUFBYSxJQUFJLEtBQUssVUFBVSxlQUFlO0FBQUEsSUFHaEQsSUFBSSxjQUFjLG9CQUFvQjtBQUFBLE1BQ3JDLFdBQVc7QUFBQSxNQUNYO0FBQUEsTUFDQTtBQUFBLE1BQ0EsZUFBZSxzQkFBc0Isc0JBQVEsS0FBSyxTQUFTLHNCQUFRLEtBQUsscUJBQXFCO0FBQUEsSUFDOUYsQ0FBQyxHQUVHLFVBQVUsTUFBTSxzQkFBc0IsT0FBTyxzQkFBUSxLQUFLLE9BQU8sc0JBQVEsS0FBSyxNQUFNLFVBQVUsV0FBVztBQUFBLElBRTdHLGlCQUFLLGVBQWUsUUFBUSxLQUFLLEdBRWpDLGlCQUFLLDZDQUE0QztBQUFBLElBQ2hELE9BQU8sT0FBTztBQUFBLElBRWYsTUFEQSxzQkFBVSw2QkFBNkIsT0FBTyxLQUFLLEdBQUcsR0FDaEQ7QUFBQTtBQUFBO0FBSVIsS0FBSzsiLAogICJkZWJ1Z0lkIjogIjAwNDI0NDk5MTI3MkM0RjE2NDc1NkUyMTY0NzU2RTIxIiwKICAibmFtZXMiOiBbXQp9
