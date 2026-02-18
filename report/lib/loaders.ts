/**
 * Data loaders for metrics, alerts, and metadata
 */

import * as fs from 'node:fs/promises'

import type { CollectedAlert } from '../../shared/alerts.js'
import type { CollectedMetric } from '../../shared/metrics.js'
import type { TestMetadata } from '../../shared/metadata.js'

/**
 * Load metrics from JSONL file
 */
export async function loadMetrics(filePath: string): Promise<CollectedMetric[]> {
	let content = await fs.readFile(filePath, 'utf-8')
	let metrics: CollectedMetric[] = []

	for (let line of content.trim().split('\n')) {
		if (!line.trim()) continue

		try {
			metrics.push(JSON.parse(line))
		} catch {
			// Skip invalid lines
			continue
		}
	}

	return metrics
}

/**
 * Load alerts from JSONL file
 */
export async function loadAlerts(filePath: string): Promise<CollectedAlert[]> {
	let content = await fs.readFile(filePath, 'utf-8')
	let alerts: CollectedAlert[] = []

	for (let line of content.trim().split('\n')) {
		if (!line.trim()) continue

		try {
			alerts.push(JSON.parse(line))
		} catch {
			// Skip invalid lines
			continue
		}
	}

	return alerts
}

/**
 * Load metadata from JSON file
 */
export async function loadMetadata(filePath: string): Promise<TestMetadata> {
	let content = await fs.readFile(filePath, 'utf-8')
	return JSON.parse(content)
}
