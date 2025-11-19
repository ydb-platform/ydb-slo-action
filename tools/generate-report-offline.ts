#!/usr/bin/env bun
/**
 * Generate reports from already downloaded artifacts
 *
 * Usage:
 *   bun tools/generate-report-offline.ts <path_to_artifacts_dir>
 *
 * Example:
 *   bun tools/generate-report-offline.ts .local-reports/run-19493074256
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

import { compareWorkloadMetrics } from '../report/lib/analysis.js'
import { generateHTMLReport, type HTMLReportData } from '../report/lib/html.js'
import { parseMetricsJsonl, type MetricsMap } from '../report/lib/metrics.js'
import { formatEvents, parseEventsJsonl, type FormattedEvent } from '../report/lib/events.js'
import { loadThresholds } from '../report/lib/thresholds.js'

interface TestMetadata {
	workload: string
	start_time: string
	start_epoch_ms: number
	end_time: string
	end_epoch_ms: number
	duration_ms: number
	workload_baseline_ref?: string
	workload_current_ref?: string
}

interface WorkloadArtifacts {
	workload: string
	pullNumber: number
	metrics: MetricsMap
	events: FormattedEvent[]
	logsPath?: string
	metadata?: TestMetadata
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
			meta?: string
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
		} else if (file.endsWith('-meta.json')) {
			workload = file.replace('-meta.json', '')
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
		} else if (file.endsWith('-meta.json')) {
			group.meta = fullPath
		}

		workloadFiles.set(workload, group)
	}

	// Parse workload data
	let workloads: WorkloadArtifacts[] = []

	for (let [workload, files] of workloadFiles) {
		if (!files.pull || !files.metrics) {
			console.log(`  ⚠️  Skipping incomplete workload ${workload}: missing required files`)
			continue
		}

		try {
			let pullNumber = parseInt(fs.readFileSync(files.pull, { encoding: 'utf-8' }).trim())
			let metricsContent = fs.readFileSync(files.metrics, { encoding: 'utf-8' })
			let metrics = parseMetricsJsonl(metricsContent)

			// Load metadata
			let metadata: TestMetadata | undefined
			if (files.meta && fs.existsSync(files.meta)) {
				try {
					let metaContent = fs.readFileSync(files.meta, { encoding: 'utf-8' })
					metadata = JSON.parse(metaContent) as TestMetadata
				} catch (error) {
					console.log(`     ⚠️  Failed to parse metadata: ${String(error)}`)
				}
			}

			let events: FormattedEvent[] = []

			// Load events
			if (files.chaosEvents && fs.existsSync(files.chaosEvents)) {
				let eventsContent = fs.readFileSync(files.chaosEvents, { encoding: 'utf-8' })
				if (eventsContent.trim()) {
					let rawEvents = parseEventsJsonl(eventsContent)
					events.push(...formatEvents(rawEvents))
				}
			}

			// Sort events by timestamp
			events.sort((a, b) => a.timestamp - b.timestamp)

			workloads.push({
				workload,
				pullNumber,
				metrics,
				events,
				logsPath: files.logs,
				metadata,
			})

			let metaInfo = metadata ? ` (${(metadata.duration_ms / 1000).toFixed(0)}s test)` : ''
			console.log(`  ✅ ${workload}: ${metrics.size} metrics, ${events.length} events${metaInfo}`)
		} catch (error) {
			console.log(`  ⚠️  Failed to parse workload ${workload}: ${String(error)}`)
			continue
		}
	}

	return workloads
}

/**
 * Main function
 */
async function main() {
	console.log('🌋 YDB SLO Action - Offline Report Generator\n')

	// Parse arguments
	let args = process.argv.slice(2)
	if (args.length === 0) {
		console.error('Usage: bun tools/generate-report-offline.ts <path_to_artifacts_dir>')
		console.error('\nExample:')
		console.error('  bun tools/generate-report-offline.ts .local-reports/run-19493074256')
		process.exit(1)
	}

	let artifactsDir = args[0]

	if (!fs.existsSync(artifactsDir)) {
		console.error(`❌ Directory not found: ${artifactsDir}`)
		process.exit(1)
	}

	console.log(`📁 Artifacts directory: ${artifactsDir}\n`)

	// Parse workload data from downloaded files
	console.log('📦 Parsing workload data...')
	let workloads = parseWorkloadArtifacts(artifactsDir)

	if (workloads.length === 0) {
		console.error('❌ No workload artifacts found!')
		process.exit(1)
	}

	console.log(`\n✅ Found ${workloads.length} workload(s)\n`)

	// Load thresholds (use defaults)
	console.log('⚙️  Loading thresholds...')
	let thresholds = await loadThresholds('', '')
	console.log(`✅ Neutral change threshold: ${thresholds.neutral_change_percent}%\n`)

	// Analyze metrics
	console.log('📊 Analyzing metrics...')
	let comparisons = workloads.map((w) => {
		let currentRef = w.metadata?.workload_current_ref || 'current'
		let baselineRef = w.metadata?.workload_baseline_ref || 'base'
		return compareWorkloadMetrics(
			w.workload,
			w.metrics,
			currentRef,
			baselineRef,
			'avg',
			thresholds.neutral_change_percent
		)
	})
	console.log('✅ Analysis complete\n')

	// Generate HTML reports
	console.log('📝 Generating HTML reports...')
	let outputDir = path.join(artifactsDir, 'reports')
	fs.mkdirSync(outputDir, { recursive: true })

	for (let i = 0; i < workloads.length; i++) {
		let workload = workloads[i]
		let comparison = comparisons[i]

		// Create commit info from metadata refs
		let currentRef = workload.metadata?.workload_current_ref || 'current'
		let baselineRef = workload.metadata?.workload_baseline_ref || 'base'

		let htmlData: HTMLReportData = {
			workload: workload.workload,
			comparison,
			metrics: workload.metrics,
			events: workload.events,
			currentRef,
			baselineRef,
			prNumber: workload.pullNumber || 0,
			testStartTime: workload.metadata?.start_epoch_ms || Date.now() - 10 * 60 * 1000,
			testEndTime: workload.metadata?.end_epoch_ms || Date.now(),
		}

		let html = generateHTMLReport(htmlData)
		let htmlPath = path.join(outputDir, `${workload.workload}.html`)
		fs.writeFileSync(htmlPath, html, { encoding: 'utf-8' })

		// Print summary
		let summary = comparison.summary
		let status = summary.regressions > 0 ? '🟡' : summary.improvements > 0 ? '🟢' : '⚪'
		console.log(
			`  ${status} ${workload.workload}: ${summary.total} metrics (${summary.improvements} improvements, ${summary.regressions} regressions, ${summary.stable} stable)`
		)
	}

	console.log('\n✨ Report generation complete!\n')
	console.log('📂 Open reports in browser:')
	for (let workload of workloads) {
		let htmlPath = path.join(outputDir, `${workload.workload}.html`)
		console.log(`   file://${path.resolve(htmlPath)}`)
	}
}

main().catch((error) => {
	console.error('\n❌ Error:', error)
	process.exit(1)
})
