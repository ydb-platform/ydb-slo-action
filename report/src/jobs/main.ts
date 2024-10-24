import * as fs from 'node:fs';
import * as path from 'node:path';
import { DefaultArtifactClient } from '@actions/artifact';
import { debug, getInput, info } from '@actions/core'
import { context, getOctokit } from '@actions/github';

(async function main() {
	let cwd = path.resolve(process.env['GITHUB_WORKSPACE'] || process.cwd())

	debug(JSON.stringify(context, null, 4))
	let artifactClient = new DefaultArtifactClient();

	let { artifacts } = await artifactClient.listArtifacts({
		findBy: {
			token: getInput("token", { required: true }),
			workflowRunId: parseInt(getInput("run_id", { required: true })),
			repositoryOwner: context.repo.owner,
			repositoryName: context.repo.repo,
		}
	});

	debug(`Found ${artifacts.length} artifacts: ${JSON.stringify(artifacts, null, 4)}`)

	let reports: Record<string, string> = {}
	let pulls: Record<string, string> = {}

	for (let artifact of artifacts) {
		debug(`Downloading artifact ${artifact.id}...`)
		let { downloadPath } = await artifactClient.downloadArtifact(artifact.id, {
			path: cwd,
			findBy: {
				token: getInput("token", { required: true }),
				workflowRunId: parseInt(getInput("run_id", { required: true })),
				repositoryOwner: context.repo.owner,
				repositoryName: context.repo.repo,
			}
		});

		info(`Downloaded artifact ${artifact.id} to ${downloadPath}`)

		if (artifact.name.endsWith("-report.md")) {
			reports[artifact.name.slice(0, -"-report.md".length)] = path.join(cwd, artifact.name);
		}

		if (artifact.name.endsWith("-pull.txt")) {
			pulls[artifact.name.slice(0, -"-pull.txt".length)] = path.join(cwd, artifact.name);
		}
	}

	for (let sdk of Object.keys(reports)) {
		let pr = fs.readFileSync(pulls[sdk], { encoding: "utf-8" });
		let report = fs.readFileSync(reports[sdk], { encoding: "utf-8" });

		debug(`Creating report for ${sdk}...`)
		let { data } = await getOctokit(getInput("token", { required: true })).rest.issues.createComment({
			issue_number: parseInt(pr.trim()),
			owner: context.repo.owner,
			repo: context.repo.repo,
			body: report
		})

		debug(`Report for ${sdk} created: ${data.html_url}`)
	}
})()
