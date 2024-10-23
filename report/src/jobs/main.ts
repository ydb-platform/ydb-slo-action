import { DefaultArtifactClient } from '@actions/artifact';
import { debug, getInput } from '@actions/core'
import { context } from '@actions/github';

(async function main() {
	let artifact = new DefaultArtifactClient();

	let response = await artifact.getArtifact(`report.md`, {
		findBy: {
			token: getInput("GITHUB_TOKEN"),
			workflowRunId: context.payload.runId,
			repositoryOwner: context.repo.owner,
			repositoryName: context.repo.repo,
		}
	});

	debug(JSON.stringify(response.artifact, null, 4))
})()
