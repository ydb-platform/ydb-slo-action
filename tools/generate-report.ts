#!/usr/bin/env bun
/**
 * Local report generator from GitHub Actions artifacts
 *
 * Usage:
 *   bun tools/generate-report.ts <run_id_or_url> [github_token]
 *
 * Examples:
 *   bun tools/generate-report.ts 1234567890
 *   bun tools/generate-report.ts https://github.com/owner/repo/actions/runs/1234567890
 *   GITHUB_TOKEN=ghp_xxx bun tools/generate-report.ts 1234567890
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

import { DefaultArtifactClient } from '@actions/artifact'

import { compareWorkloadMetrics } from '../report/lib/analysis.js'
import { generateHTMLReport, type HTMLReportData } from '../report/lib/html.js'
import { parseMetricsJsonl, type MetricsMap } from '../report/lib/metrics.js'
import { formatEvents, parseEventsJsonl, type FormattedEvent } from '../report/lib/events.js'
import { loadThresholds } from '../report/lib/thresholds.js'

interface ParsedRunInfo {
	runId: number
	owner: string
	repo: string
}

interface WorkloadArtifacts {
	workload: string
	pullNumber: number
	metrics: MetricsMap
	events: FormattedEvent[]
	logsPath?: string
}

/**
 * Parse workload artifacts from flat directory structure
 */
function parseWorkloadArtifacts(downloadPath: string): WorkloadArtifacts[] {
	// Scan directory for all files
	let files = fs.readdirSync(downloadPath)

	// Group files by workload name (prefix before -metrics.jsonl, -events.jsonl, etc.)
	let workloadFiles = new Map<
		string,
		{
			pull?: string
			metrics?: string
			events?: string
			chaosEvents?: string
			logs?: string
		}
	>()

	for (let file of files) {
		let fullPath = path.join(downloadPath, file)

		// Extract workload name from filename
		let workload: string | null = null

		if (file.endsWith('-pull.txt')) {
			workload = file.replace('-pull.txt', '')
		} else if (file.endsWith('-metrics.jsonl')) {
			workload = file.replace('-metrics.jsonl', '')
		} else if (file.endsWith('-events.jsonl')) {
			workload = file.replace('-events.jsonl', '')
		} else if (file.endsWith('-logs.txt')) {
			workload = file.replace('-logs.txt', '')
		}

		if (!workload) continue

		let group = workloadFiles.get(workload) || {}

		if (file.endsWith('-pull.txt')) {
			group.pull = fullPath
		} else if (file.endsWith('-metrics.jsonl')) {
			group.metrics = fullPath
		} else if (file.endsWith('-events.jsonl')) {
			group.chaosEvents = fullPath
		} else if (file.endsWith('-logs.txt')) {
			group.logs = fullPath
		}

		workloadFiles.set(workload, group)
	}

	// Parse workload data
	let workloads: WorkloadArtifacts[] = []

	for (let [workload, files] of workloadFiles) {
		if (!files.pull || !files.metrics) {
			console.log(`⚠️  Skipping incomplete workload ${workload}: missing required files`)
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

			workloads.push({
				workload,
				pullNumber,
				metrics,
				events,
				logsPath: files.logs,
			})
		} catch (error) {
			console.log(`⚠️  Failed to parse workload ${workload}: ${String(error)}`)
			continue
		}
	}

	return workloads
}

/**
 * Parse run ID or URL from command line argument
 */
function parseRunInfo(input: string): ParsedRunInfo {
	// Try to parse as URL
	let urlMatch = input.match(/github\.com\/([^\/]+)\/([^\/]+)\/actions\/runs\/(\d+)/)
	if (urlMatch) {
		return {
			owner: urlMatch[1],
			repo: urlMatch[2],
			runId: parseInt(urlMatch[3]),
		}
	}

	// Try to parse as plain run ID
	let runId = parseInt(input)
	if (!isNaN(runId)) {
		// Need to get owner/repo from environment or defaults
		let fullRepo = process.env.GITHUB_REPOSITORY || 'ydb-platform/ydb-slo-action'
		let [owner, repo] = fullRepo.split('/')
		return { owner, repo, runId }
	}

	throw new Error(`Invalid run ID or URL: ${input}`)
}

/**
 * Main function
 */
async function main() {
	console.log('🌋 YDB SLO Action - Local Report Generator\n')

	// Parse arguments
	let args = process.argv.slice(2)
	if (args.length === 0) {
		console.error('Usage: bun tools/generate-report.ts <run_id_or_url> [github_token]')
		console.error('\nExamples:')
		console.error('  bun tools/generate-report.ts 1234567890')
		console.error('  bun tools/generate-report.ts https://github.com/owner/repo/actions/runs/1234567890')
		console.error('  GITHUB_TOKEN=ghp_xxx bun tools/generate-report.ts 1234567890')
		process.exit(1)
	}

	let input = args[0]
	let token = args[1] || process.env.GITHUB_TOKEN || ''

	if (!token) {
		console.error('❌ GitHub token is required!')
		console.error('   Set GITHUB_TOKEN environment variable or pass as second argument')
		process.exit(1)
	}

	// Parse run info
	let runInfo: ParsedRunInfo
	try {
		runInfo = parseRunInfo(input)
		console.log(`📦 Target: ${runInfo.owner}/${runInfo.repo} run #${runInfo.runId}`)
	} catch (error) {
		console.error(`❌ ${error}`)
		process.exit(1)
	}

	// Setup working directory
	let workDir = path.join(process.cwd(), '.local-reports', `run-${runInfo.runId}`)
	fs.mkdirSync(workDir, { recursive: true })
	console.log(`📁 Working directory: ${workDir}\n`)

	// Download artifacts
	console.log('📥 Downloading artifacts...')

	let artifactClient = new DefaultArtifactClient()
	let { artifacts } = await artifactClient.listArtifacts({
		findBy: {
			token,
			workflowRunId: runInfo.runId,
			repositoryOwner: runInfo.owner,
			repositoryName: runInfo.repo,
		},
	})

	console.log(`Found ${artifacts.length} artifacts`)

	// Download all artifacts (skip *-logs artifacts as they're huge and not needed for reports)
	for (let artifact of artifacts) {
		if (artifact.name.endsWith('-logs')) {
			console.log(`  ⏭️  Skipping logs artifact: ${artifact.name}`)
			continue
		}

		console.log(`  📦 Downloading: ${artifact.name}...`)
		await artifactClient.downloadArtifact(artifact.id, {
			path: workDir,
			findBy: {
				token,
				workflowRunId: runInfo.runId,
				repositoryOwner: runInfo.owner,
				repositoryName: runInfo.repo,
			},
		})
	}

	console.log('✅ All artifacts downloaded\n')

	// Parse workload data from downloaded files
	console.log('📦 Parsing workload data...')
	let workloads = parseWorkloadArtifacts(workDir)

	if (workloads.length === 0) {
		console.error('❌ No workload artifacts found!')
		process.exit(1)
	}

	console.log(`✅ Found ${workloads.length} workload(s): ${workloads.map((w) => w.workload).join(', ')}\n`)

	// Load thresholds (use defaults)
	console.log('⚙️  Loading thresholds...')
	let thresholds = await loadThresholds('', '')
	console.log(`✅ Neutral change threshold: ${thresholds.neutral_change_percent}%\n`)

	// Analyze metrics
	console.log('📊 Analyzing metrics...')
	let comparisons = workloads.map((w) =>
		compareWorkloadMetrics(w.workload, w.metrics, 'avg', thresholds.neutral_change_percent)
	)
	console.log('✅ Analysis complete\n')

	// Generate HTML reports
	console.log('📝 Generating HTML reports...')
	let outputDir = path.join(workDir, 'reports')
	fs.mkdirSync(outputDir, { recursive: true })

	for (let i = 0; i < workloads.length; i++) {
		let workload = workloads[i]
		let comparison = comparisons[i]

		// Create mock commit info (we don't have PR context here)
		let htmlData: HTMLReportData = {
			workload: workload.workload,
			comparison,
			metrics: workload.metrics,
			events: workload.events,
			currentRef: 'current',
			baselineRef: 'base',
			prNumber: workload.pullNumber || 0,
			testStartTime: 0,
			testEndTime: Date.now(),
		}

		let html = generateHTMLReport(htmlData)
		let htmlPath = path.join(outputDir, `${workload.workload}.html`)
		fs.writeFileSync(htmlPath, html, { encoding: 'utf-8' })

		console.log(`  ✅ ${workload.workload} → ${htmlPath}`)

		// Print summary
		let summary = comparison.summary
		console.log(
			`     📊 ${summary.total} metrics: ${summary.improvements} improvements, ${summary.regressions} regressions, ${summary.stable} stable`
		)
	}

	console.log('\n✨ Report generation complete!\n')
	console.log('📂 Open reports in browser:')
	for (let workload of workloads) {
		let htmlPath = path.join(outputDir, `${workload.workload}.html`)
		console.log(`   file://${htmlPath}`)
	}
}

main().catch((error) => {
	console.error('\n❌ Error:', error)
	process.exit(1)
})
