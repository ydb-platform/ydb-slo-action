/**
 * Artifacts download and parsing
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

import { DefaultArtifactClient } from '@actions/artifact'
import { debug, getInput, warning } from '@actions/core'
import { context } from '@actions/github'

export interface WorkloadArtifacts {
	name: string
	logsPath: string
	eventsPath: string
	metricsPath: string
	metadataPath: string
}

/**
 * Download artifacts for a workflow run
 */
export async function downloadRunArtifacts(destinationPath: string): Promise<Map<string, WorkloadArtifacts>> {
	let token = getInput('github_token')
	let workflowRunId = parseInt(getInput('github_run_id') || String(context.runId))

	if (!token || !workflowRunId) {
		throw new Error('GitHub token and workflow run ID are required to download artifacts')
	}

	let artifactClient = new DefaultArtifactClient()
	let { artifacts } = await artifactClient.listArtifacts({
		findBy: {
			token: token,
			workflowRunId: workflowRunId,
			repositoryName: context.repo.repo,
			repositoryOwner: context.repo.owner,
		},
	})

	debug(`Found ${artifacts.length} artifacts in workflow run ${workflowRunId}`)

	// Download each artifact to its own subdirectory
	let downloadedPaths = new Map<string, string>()

	for (let artifact of artifacts) {
		let artifactDir = path.join(destinationPath, artifact.name)

		debug(`Downloading artifact ${artifact.name}...`)

		let { downloadPath } = await artifactClient.downloadArtifact(artifact.id, {
			path: artifactDir,
			findBy: {
				token: token,
				workflowRunId: workflowRunId,
				repositoryName: context.repo.repo,
				repositoryOwner: context.repo.owner,
			},
		})

		let artifactPath = downloadPath || artifactDir
		downloadedPaths.set(artifact.name, artifactPath)

		debug(`Downloaded artifact ${artifact.name} to ${artifactPath}`)
	}

	// Group artifacts by workload
	let runArtifacts = new Map<string, WorkloadArtifacts>()

	for (let [artifactName, artifactPath] of downloadedPaths) {
		// Artifact name is the workload name, files inside have workload prefix
		let workload = artifactName

		// List files in artifact directory
		if (!fs.existsSync(artifactPath)) {
			warning(`Artifact path does not exist: ${artifactPath}`)
			continue
		}

		let stat = fs.statSync(artifactPath)
		let files: string[] = []

		if (stat.isDirectory()) {
			files = fs.readdirSync(artifactPath).map((f) => path.join(artifactPath, f))
		} else {
			files = [artifactPath]
		}

		let group = runArtifacts.get(workload) || ({} as WorkloadArtifacts)
		group.name = workload

		for (let file of files) {
			let basename = path.basename(file)

			if (basename.endsWith('-logs.txt')) {
				group.logsPath = file
			} else if (basename.endsWith('-events.jsonl')) {
				group.eventsPath = file
			} else if (basename.endsWith('-metrics.jsonl')) {
				group.metricsPath = file
			} else if (basename.endsWith('-metadata.json')) {
				group.metadataPath = file
			}
		}

		runArtifacts.set(workload, group)
	}

	return runArtifacts
}
