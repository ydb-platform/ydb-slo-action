/**
 * HTML report generation for report2
 *
 * Simple approach: load template file and inject raw JSON data
 */

import * as fs from 'node:fs/promises'

import { info } from '@actions/core'

import type { CollectedAlert } from '../../shared/alerts.js'
import type { CollectedMetric } from '../../shared/metrics.js'
import type { TestMetadata } from '../../shared/metadata.js'
import type { ThresholdConfig } from '../../shared/thresholds.js'

import defaultTemplate from '../template.html' with { type: 'text' }

export interface ReportData {
	meta: TestMetadata
	alerts: CollectedAlert[]
	metrics: CollectedMetric[]
	evaluation?: unknown
	thresholds?: ThresholdConfig | null
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
	let dataScript = `const data = ${JSON.stringify(data)};`
	return template.replace('/*DATA_INJECTION*/', dataScript)
}

/**
 * Generate HTML report from metrics, alerts, and metadata
 */
export async function generateHTMLReport(
	meta: TestMetadata,
	alerts: CollectedAlert[],
	metrics: CollectedMetric[],
	templatePath?: string,
	evaluation?: unknown,
	thresholds?: ThresholdConfig | null
): Promise<string> {
	let template = await loadTemplate(templatePath)
	return injectData(template, { meta, alerts, metrics, evaluation, thresholds })
}
