/**
 * Artifacts download and parsing
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

import { DefaultArtifactClient } from '@actions/artifact'
import { debug, info, warning } from '@actions/core'

import { formatEvents, parseEventsJsonl, type FormattedEvent } from './events.js'
import { parseMetricsJsonl, type MetricsMap } from './metrics.js'

export interface TestMetadata {
	workload: string
	start_time: string
	start_epoch_ms: number
	end_time: string
	end_epoch_ms: number
	duration_ms: number
	workload_current_ref?: string
	workload_baseline_ref?: string
}

export interface WorkloadArtifacts {
	workload: string
	pullNumber: number
	metrics: MetricsMap
	events: FormattedEvent[]
	logsPath?: string
	metadata?: TestMetadata
}

export interface ArtifactDownloadOptions {
	token: string
	workflowRunId: number
	repositoryOwner: string
	repositoryName: string
	downloadPath: string
}

/**
 * Download and parse artifacts for a workflow run
 */
export async function downloadWorkloadArtifacts(options: ArtifactDownloadOptions): Promise<WorkloadArtifacts[]> {
	let artifactClient = new DefaultArtifactClient()

	info(`Listing artifacts for workflow run ${options.workflowRunId}...`)

	let { artifacts } = await artifactClient.listArtifacts({
		findBy: {
			token: options.token,
			workflowRunId: options.workflowRunId,
			repositoryOwner: options.repositoryOwner,
			repositoryName: options.repositoryName,
		},
	})

	info(`Found ${artifacts.length} artifacts`)
	debug(
		`Artifacts: ${JSON.stringify(
			artifacts.map((a) => a.name),
			null,
			2
		)}`
	)

	// Download all artifacts
	let downloadedPaths = new Map<string, string>()

	for (let artifact of artifacts) {
		info(`Downloading artifact ${artifact.name}...`)

		let { downloadPath } = await artifactClient.downloadArtifact(artifact.id, {
			path: options.downloadPath,
			findBy: {
				token: options.token,
				workflowRunId: options.workflowRunId,
				repositoryOwner: options.repositoryOwner,
				repositoryName: options.repositoryName,
			},
		})

		// downloadPath already points to where the artifact was extracted
		let artifactPath = downloadPath || options.downloadPath
		downloadedPaths.set(artifact.name, artifactPath)

		info(`Downloaded artifact ${artifact.name} to ${artifactPath}`)
	}

	// Group files by workload
	let workloadFiles = new Map<
		string,
		{
			pull?: string
			meta?: string
			logs?: string
			events?: string
			metrics?: string
			chaosEvents?: string
		}
	>()

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

		let group = workloadFiles.get(workload) || {}

		for (let file of files) {
			let basename = path.basename(file)

			if (basename.endsWith('-pull.txt')) {
				group.pull = file
			} else if (basename.endsWith('-logs.txt')) {
				group.logs = file
			} else if (basename.endsWith('-meta.json')) {
				group.meta = file
			} else if (basename.endsWith('-events.jsonl')) {
				group.chaosEvents = file
			} else if (basename.endsWith('-metrics.jsonl')) {
				group.metrics = file
			}
		}

		workloadFiles.set(workload, group)
	}

	// Parse workload data
	let workloads: WorkloadArtifacts[] = []

	for (let [workload, files] of workloadFiles) {
		if (!files.pull || !files.metrics) {
			warning(`Skipping incomplete workload ${workload}: missing required files`)
			continue
		}

		try {
			let pullNumber = parseInt(fs.readFileSync(files.pull, { encoding: 'utf-8' }).trim())
			let metricsContent = fs.readFileSync(files.metrics, { encoding: 'utf-8' })
			let metrics = parseMetricsJsonl(metricsContent)

			let events: FormattedEvent[] = []

			// Load events
			if (files.chaosEvents && fs.existsSync(files.chaosEvents)) {
				let eventsContent = fs.readFileSync(files.chaosEvents, { encoding: 'utf-8' })
				let rawEvents = parseEventsJsonl(eventsContent)
				events.push(...formatEvents(rawEvents))
			}

			// Sort events by timestamp
			events.sort((a, b) => a.timestamp - b.timestamp)

			// Load metadata
			let metadata: TestMetadata | undefined
			if (files.meta && fs.existsSync(files.meta)) {
				try {
					let metaContent = fs.readFileSync(files.meta, { encoding: 'utf-8' })
					metadata = JSON.parse(metaContent) as TestMetadata
				} catch (error) {
					warning(`Failed to parse metadata for ${workload}: ${String(error)}`)
				}
			}

			workloads.push({
				workload,
				pullNumber,
				metrics,
				events,
				logsPath: files.logs,
				metadata,
			})

			let testDuration = metadata ? `${(metadata.duration_ms / 1000).toFixed(0)}s` : 'unknown'
			info(`Parsed workload ${workload}: ${metrics.size} metrics, ${events.length} events (${testDuration} test)`)
		} catch (error) {
			warning(`Failed to parse workload ${workload}: ${String(error)}`)
			continue
		}
	}

	return workloads
}
