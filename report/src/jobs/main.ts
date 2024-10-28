import { DefaultArtifactClient } from '@actions/artifact';
import { debug, getInput, info } from '@actions/core'
import { context } from '@actions/github';

(async function main() {
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

	info(`Found ${artifacts.length} artifacts: ${JSON.stringify(artifacts, null, 4)}`)
})()
