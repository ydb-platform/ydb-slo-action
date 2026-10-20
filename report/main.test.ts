import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { randomUUID } from 'node:crypto'

import * as core from '@actions/core'
import * as github from '@actions/github'
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
	let uploaded: string[] = []
	let inputSpy = spyOn(core, 'getInput').mockImplementation((name) =>
		name === 'github_issue' ? '123' : ''
	)
	let failureSpy = spyOn(core, 'setFailed').mockImplementation((message) => {
		throw new Error(String(message))
	})
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
		return { url: 'https://example.invalid/comments/1', id: 1 }
	})
	try {
		let { completion } = await import('./main.js')
		await completion
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

for (let conclusion of ['skipped', 'cancelled', 'failure']) {
	test(`label cleanup runs after a ${conclusion} source even if reporting fails`, async () => {
		let payload = github.context.payload
		let labels = [{ name: 'SLO' }]
		let failures: string[] = []
		let inputSpy = spyOn(core, 'getInput').mockImplementation(
			(name) => ({ github_token: 'token', remove_label: 'SLO' })[name] || ''
		)
		let client = github.getOctokit('token', {
			request: {
				fetch: async (_url: string, options: RequestInit) => {
					if (options.method === 'DELETE') labels = []
					return Response.json(labels)
				},
			},
		})
		let clientSpy = spyOn(github, 'getOctokit').mockReturnValue(client)
		let failureSpy = spyOn(core, 'setFailed').mockImplementation((message) => {
			failures.push(String(message))
		})
		let downloadSpy = spyOn(artifacts, 'downloadRunArtifacts').mockImplementation(async () => {
			if (conclusion === 'failure') throw new Error('Artifact retrieval failed')
			return new Map()
		})
		github.context.payload = {
			workflow_run: { conclusion, pull_requests: [{ number: 737 }] },
			repository: { name: 'sdk', owner: { login: 'org' } },
		}
		try {
			let modulePath = `./main.ts?${randomUUID()}`
			let { completion } = await import(modulePath)
			await completion
			expect(labels).toEqual([])
			expect(failures).toHaveLength(conclusion === 'failure' ? 1 : 0)
		} finally {
			github.context.payload = payload
			inputSpy.mockRestore()
			clientSpy.mockRestore()
			failureSpy.mockRestore()
			downloadSpy.mockRestore()
		}
	})
}
