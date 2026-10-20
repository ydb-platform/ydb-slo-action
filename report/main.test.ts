import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { randomUUID } from 'node:crypto'

import * as core from '@actions/core'
import { expect, spyOn, test } from 'bun:test'

import * as artifacts from './lib/artifacts.js'
import * as comments from './lib/comment.js'
import type { CollectedMetric } from '../shared/metrics.js'

test('a failed workload still uploads its metrics graph with a failure verdict', async () => {
	let directory = await fs.mkdtemp(path.join(os.tmpdir(), 'slo-failed-report-'))
	let workload = `failed-${randomUUID()}`
	let htmlPath = path.join(process.cwd(), '.slo-reports', `${workload}-report.html`)
	let metric: CollectedMetric = {
		name: 'ydb.client.operation.duration',
		role: 'diagnostic',
		type: 'range',
		query: '',
		data: [
			{
				metric: { ref: 'current' },
				values: [
					[1, '0.1'],
					[2, '0.2'],
				],
			},
		],
	}
	await fs.writeFile(
		path.join(directory, 'metadata.json'),
		JSON.stringify({
			workload,
			failed: 'workload',
			workload_current_ref: 'current',
		})
	)
	await fs.writeFile(path.join(directory, 'metrics.jsonl'), JSON.stringify(metric))
	await fs.writeFile(path.join(directory, 'alerts.jsonl'), '')
	let completed = Promise.withResolvers<void>()
	let uploaded: string[] = []
	let inputSpy = spyOn(core, 'getInput').mockImplementation((name) =>
		name === 'github_issue' ? '123' : ''
	)
	let failureSpy = spyOn(core, 'setFailed').mockImplementation((message) =>
		completed.reject(new Error(String(message)))
	)
	let downloadSpy = spyOn(artifacts, 'downloadRunArtifacts').mockResolvedValue(
		new Map([
			[
				workload,
				{
					workload,
					metaPath: path.join(directory, 'metadata.json'),
					metricsPath: path.join(directory, 'metrics.jsonl'),
					alertsPath: path.join(directory, 'alerts.jsonl'),
				},
			],
		])
	)
	let uploadSpy = spyOn(artifacts, 'uploadReportArtifact').mockImplementation(
		async (_cwd, _name, file) => {
			uploaded.push(await fs.readFile(file, 'utf-8'))
			return 'https://example.invalid/artifacts/123'
		}
	)
	let commentSpy = spyOn(comments, 'createOrUpdateComment').mockImplementation(async () => {
		completed.resolve()
		return { url: 'https://example.invalid/comments/1', id: 1 }
	})
	try {
		await import('./main.js')
		await completed.promise
		expect(uploaded).toHaveLength(1)
		let match = uploaded[0].match(/window\.__REPORT_DATA__ = ([^\n]+);<\/script>/)
		expect(match).not.toBeNull()
		let data = JSON.parse(match?.[1] ?? '')
		expect(data.analysis.severity).toBe('failure')
		expect(data.rawMetrics).toHaveLength(1)
		expect(data.analysis.metrics).toHaveLength(1)
	} finally {
		inputSpy.mockRestore()
		failureSpy.mockRestore()
		downloadSpy.mockRestore()
		uploadSpy.mockRestore()
		commentSpy.mockRestore()
		await fs.rm(htmlPath, { force: true })
		await fs.rm(directory, { recursive: true, force: true })
	}
})
