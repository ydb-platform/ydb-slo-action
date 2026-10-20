import { getInput, info } from '@actions/core'
import { context, getOctokit } from '@actions/github'

/**
 * Explicit runs take precedence. A workflow_run publisher can instead combine
 * the latest completed workflows for the triggering revision.
 */
export async function getWorkflowRunIds(): Promise<number[]> {
	let explicit = getInput('github_run_id')
	if (explicit) {
		let ids = explicit.split(',').map((id) => Number(id.trim()))
		if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
			throw new Error('Positive workflow run IDs are required')
		}
		return ids
	}

	let source = context.payload.workflow_run
	if (!source) return [context.runId]
	if (source.conclusion === 'skipped' || source.conclusion === 'cancelled') return []

	let names = getInput('github_workflows')
		.split(',')
		.map((name) => name.trim())
		.filter(Boolean)
	if (names.length === 0) return [source.id]

	let octokit = getOctokit(getInput('github_token', { required: true }))
	let runs = await octokit.paginate(octokit.rest.actions.listWorkflowRunsForRepo, {
		...context.repo,
		head_sha: source.head_sha,
		event: source.event,
		status: 'completed',
		per_page: 100,
	})
	// Include the event itself even before the listing API catches up.
	runs.push(source)
	let latest = new Map<string, (typeof runs)[number]>()
	for (let run of runs) {
		if (
			!run.name ||
			!names.includes(run.name) ||
			run.head_sha !== source.head_sha ||
			run.event !== source.event ||
			run.status !== 'completed' ||
			run.conclusion === 'skipped' ||
			run.conclusion === 'cancelled'
		) {
			continue
		}
		let previous = latest.get(run.name)
		if (!previous || run.run_number >= previous.run_number) latest.set(run.name, run)
	}
	return [...latest.values()].map((run) => run.id)
}

/**
 * Label cleanup also runs after skipped/cancelled runs or reporting failures.
 */
export async function removeSloLabel(): Promise<void> {
	let label = getInput('remove_label')
	if (!label) return

	let source = context.payload.workflow_run
	let pull = source?.pull_requests?.[0]?.number ?? context.payload.pull_request?.number
	let octokit = getOctokit(getInput('github_token', { required: true }))
	if (!pull && source?.head_repository) {
		let { data } = await octokit.rest.pulls.list({
			...context.repo,
			head: `${source.head_repository.owner.login}:${source.head_branch}`,
			state: 'open',
		})
		pull = data[0]?.number
	}
	if (!pull) throw new Error('Cannot resolve the pull request for SLO label cleanup')

	let labels = await octokit.paginate(octokit.rest.issues.listLabelsOnIssue, {
		...context.repo,
		issue_number: pull,
		per_page: 100,
	})
	if (labels.some((candidate) => candidate.name === label)) {
		await octokit.rest.issues.removeLabel({
			...context.repo,
			issue_number: pull,
			name: label,
		})
		info(`Removed ${label} label from PR #${pull}`)
	}
}
