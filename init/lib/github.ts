import { getInput } from '@actions/core'
import { context, getOctokit } from '@actions/github'

/**
 * Resolves pull request number from input, context, or API
 */
export async function getPullRequestNumber(): Promise<number | null> {
	let explicitPrNumber = getInput('github_pull_request_number')
	if (explicitPrNumber) {
		return Number.parseInt(explicitPrNumber, 10)
	}

	if (context.payload.pull_request) {
		return context.payload.pull_request.number
	}

	let token = getInput('github_token')
	if (!token) {
		return null
	}

	try {
		let { data } = await getOctokit(token).rest.repos.listPullRequestsAssociatedWithCommit({
			owner: context.repo.owner,
			repo: context.repo.repo,
			commit_sha: context.sha,
		})

		if (data.length > 0) {
			return data[0].number
		}
	} catch {
		return null
	}

	return null
}
