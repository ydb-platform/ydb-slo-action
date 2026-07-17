/**
 * HTML report generation
 *
 * Simple approach: load template file and inject raw JSON data
 */

import * as fs from 'node:fs/promises'

import { info } from '@actions/core'

import type { CollectedAlert } from '../../shared/alerts.js'
import type { CollectedMetric } from '../../shared/metrics.js'
import type { TestMetadata } from '../../shared/metadata.js'
import type { WorkloadAnalysis } from '../../shared/analysis.js'

import defaultTemplate from '../template/dist/index.html' with { type: 'text' }

export interface ReportData {
	meta: TestMetadata
	alerts: CollectedAlert[]
	analysis: WorkloadAnalysis
	rawMetrics: CollectedMetric[]
	config: { emaAlpha: number; trimPercent: number }
}

/**
 * Load HTML template from custom path or use bundled default
 */
export async function loadTemplate(customPath?: string): Promise<string> {
	if (customPath) {
		info(`Loading custom template: ${customPath}`)
		return await fs.readFile(customPath, 'utf-8')
	}

	return defaultTemplate as unknown as string
}

/**
 * Inject data into template at DATA_INJECTION marker
 */
export function injectData(template: string, data: ReportData): string {
	// Classic (non-module) script: a module data script participates in module
	// loading, and if it starts before the import map Firefox rejects the map
	// ("Import maps are not allowed after a module load or preload has started").
	// A classic script never triggers that rule. Inserted right after the import
	// map, so the map stays first in the head and precedes every module script.
	let serialized = JSON.stringify(data)
	let dataScript = `<script>window.__REPORT_DATA__ = ${serialized};</script>`
	return template.replace(/(<script type="importmap">[\s\S]*?<\/script>)/, '$1\n\t\t' + dataScript)
}

/**
 * Generate HTML report from analysis results
 */
export async function generateHTMLReport(
	meta: TestMetadata,
	alerts: CollectedAlert[],
	analysis: WorkloadAnalysis,
	metrics: CollectedMetric[],
	templatePath?: string,
	config?: { emaAlpha: number; trimPercent: number }
): Promise<string> {
	let template = await loadTemplate(templatePath)
	return injectData(template, {
		meta,
		alerts,
		analysis,
		rawMetrics: metrics,
		config: config ?? { emaAlpha: 0.15, trimPercent: 0.1 },
	})
}
