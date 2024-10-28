import { DefaultArtifactClient } from '@actions/artifact';
import { debug, getInput } from '@actions/core'
import { context } from '@actions/github';

(async function main() {
	debug(JSON.stringify(context, null, 4))
	let artifact = new DefaultArtifactClient();

	{

		let response = await artifact.getArtifact(`report.md`, {
			findBy: {
				token: getInput("token", { required: true }),
				workflowRunId: parseInt(getInput("run_id", { required: true })),
				repositoryOwner: context.repo.owner,
				repositoryName: context.repo.repo,
			}
		});

		debug(JSON.stringify(response.artifact, null, 4))
	}

	{

		let response = await artifact.getArtifact(`pull.txt`, {
			findBy: {
				token: getInput("token", { required: true }),
				workflowRunId: parseInt(getInput("run_id", { required: true })),
				repositoryOwner: context.repo.owner,
				repositoryName: context.repo.repo,
			}
		});

		debug(JSON.stringify(response.artifact, null, 4))
	}
})()
