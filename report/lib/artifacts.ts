/**
 * Artifacts download and parsing for report2
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

import { DefaultArtifactClient } from '@actions/artifact'
import { debug, getInput, warning } from '@actions/core'
import { context } from '@actions/github'

export interface WorkloadArtifact {
	workload: string
	metaPath: string
	alertsPath: string
	metricsPath: string
}

/**
 * Download all artifacts from workflow run
 */
export async function downloadRunArtifacts(destinationPath: string): Promise<Map<string, WorkloadArtifact>> {
	let token = getInput('github_token')
	let workflowRunId = parseInt(getInput('github_run_id') || String(context.runId))

	if (!token || !workflowRunId) {
		throw new Error('GitHub token and workflow run ID are required')
	}

	let artifactClient = new DefaultArtifactClient()
	let { artifacts } = await artifactClient.listArtifacts({
		findBy: {
			token,
			workflowRunId,
			repositoryName: context.repo.repo,
			repositoryOwner: context.repo.owner,
		},
	})

	debug(`Found ${artifacts.length} artifacts in run ${workflowRunId}`)

	// Download each artifact
	let downloadedPaths = new Map<string, string>()

	for (let artifact of artifacts) {
		let artifactDir = path.join(destinationPath, artifact.name)

		debug(`Downloading artifact ${artifact.name}...`)

		let { downloadPath } = await artifactClient.downloadArtifact(artifact.id, {
			path: artifactDir,
			findBy: {
				token,
				workflowRunId,
				repositoryName: context.repo.repo,
				repositoryOwner: context.repo.owner,
			},
		})

		downloadedPaths.set(artifact.name, downloadPath || artifactDir)
	}

	// Group by workload
	let workloadArtifacts = new Map<string, WorkloadArtifact>()

	for (let [artifactName, artifactPath] of downloadedPaths) {
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

		let workload = artifactName
		let artifact = workloadArtifacts.get(workload) || ({ workload } as WorkloadArtifact)

		for (let file of files) {
			let basename = path.basename(file)

			if (basename.endsWith('-metadata.json')) {
				artifact.metaPath = file
			} else if (basename.endsWith('-alerts.jsonl')) {
				artifact.alertsPath = file
			} else if (basename.endsWith('-metrics.jsonl')) {
				artifact.metricsPath = file
			}
		}

		// Only add if has all required files
		if (artifact.metaPath && artifact.metricsPath) {
			workloadArtifacts.set(workload, artifact)
		}
	}

	return workloadArtifacts
}

/**
 * Upload HTML report as artifact
 */
export async function uploadReportArtifact(
	workload: string,
	htmlPath: string,
	cwd: string,
	retentionDays: number
): Promise<string> {
	let artifactClient = new DefaultArtifactClient()

	let { id } = await artifactClient.uploadArtifact(`${workload}-html-report`, [htmlPath], cwd, {
		retentionDays,
	})

	return `https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}/artifacts/${id}`
}
