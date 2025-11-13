import { getInput } from '@actions/core'
import { context, getOctokit } from '@actions/github'

export async function getPullRequestNumber() {
	let token = getInput('github_token') || process.env.GITHUB_TOKEN

	let prNumber = getInput('github_pull_request_number')
	if (prNumber.length > 0) {
		return parseInt(prNumber)
	}

	if (context.eventName === 'pull_request') {
		return context.payload.pull_request!.number
	}

	if (token) {
		let octokit = getOctokit(token)
		let branch = context.ref.replace('refs/heads/', '')

		const { data: pulls } = await octokit.rest.pulls.list({
			state: 'open',
			owner: context.repo.owner,
			repo: context.repo.repo,
			head: `${context.actor}:${branch}`,
		})

		if (pulls.length > 0) {
			return pulls[0].number
		}
	}

	return null
}
