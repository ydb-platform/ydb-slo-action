import * as fs from 'node:fs'

import { DefaultArtifactClient } from '@actions/artifact'
import { getInput, info, warning } from '@actions/core'
import { context, getOctokit } from '@actions/github'

/**
 * Resolves pull request number from input, context, or API
 */
export async function getPullRequestNumber(): Promise<number | null> {
	let explicitPrNumber = getInput('github_issue') || getInput('github_pull_request_number')
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

/**
 * Uploads artifacts to GitHub Actions as a single bundle
 */
export async function uploadArtifacts(name: string, artifacts: string[], cwd?: string): Promise<void> {
	let artifactClient = new DefaultArtifactClient()
	let rootDirectory = cwd || process.cwd()

	let files: string[] = []

	for (let artifact of artifacts) {
		if (!fs.existsSync(artifact)) {
			warning(`Artifact source missing: ${artifact}`)
			continue
		}
		files.push(artifact)
	}

	if (files.length === 0) {
		warning('No artifacts to upload')
		return
	}

	try {
		// Keep artifacts for 1 day only to save storage space
		let { id } = await artifactClient.uploadArtifact(name, files, rootDirectory, {
			retentionDays: 1,
		})

		info(`Uploaded ${files.length} file(s) as artifact ${name} (id: ${id})`)
	} catch (error) {
		warning(`Failed to upload artifacts: ${String(error)}`)
	}
}
