import { getInput } from "@actions/core"
import { context, getOctokit } from "@actions/github"

export async function getCurrentWorkflowRuns(branch: string) {
	let { data: { workflows } } = await getOctokit(getInput("token", { required: true })).rest.actions.listRepoWorkflows({
		owner: context.repo.owner,
		repo: context.repo.repo,
	})

	let workflow = workflows.find(workflow => workflow.name === context.workflow)

	if (!workflow) {
		return []
	}

	let { data: { workflow_runs } } = await getOctokit(getInput("token", { required: true })).rest.actions.listWorkflowRuns({
		owner: context.repo.owner,
		repo: context.repo.repo,
		workflow_id: workflow.id,
		branch: branch,
		status: "completed",
	})

	return workflow_runs.filter(run => run.conclusion === "success")
}
