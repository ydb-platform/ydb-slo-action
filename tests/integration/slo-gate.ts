import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { exec } from '@actions/exec'

import { SloRunError, validateWorkloads } from '../../init/lib/slo.js'

let cwd = process.env['SLO_PROBE_DIRECTORY'] || path.join(process.cwd(), '.slo-probe')
let container = process.env['SLO_PROBE_CONTAINER'] || 'slo-v3-probe'
let ref = process.env['SLO_PROBE_REF'] || 'current'
let workloads = [{ name: 'current', container, ref }]
let baselineContainer = process.env['SLO_PROBE_BASELINE_CONTAINER']
if (baselineContainer) {
	workloads.push({
		name: 'baseline',
		container: baselineContainer,
		ref: process.env['SLO_PROBE_BASELINE_REF'] || 'baseline',
	})
}
await fs.mkdir(path.join(cwd, 'extra'), { recursive: true })
process.env['GITHUB_ACTION_PATH'] = process.cwd()
process.env['GITHUB_STEP_SUMMARY'] = path.join(cwd, 'summary.md')
await fs.writeFile(process.env['GITHUB_STEP_SUMMARY'], '')

let starts: number[] = []
let finishes: number[] = []
let failures: string[] = []
for (let workload of workloads) {
	let windowText = ''
	await exec(
		'docker',
		[
			'inspect',
			workload.container,
			'--format',
			'{{.State.StartedAt}}|{{.State.FinishedAt}}|{{.State.ExitCode}}',
		],
		{
			listeners: {
				stdout: (data) => {
					windowText += data.toString()
				},
			},
		}
	)
	let [startText, finishText, exitText] = windowText.trim().split('|')
	let start = Date.parse(startText || '')
	let finish = Date.parse(finishText || '')
	let exitCode = Number(exitText)
	if (!Number.isFinite(start) || !Number.isFinite(finish) || finish < start || !exitText) {
		throw new RangeError('Probe execution window or exit code is missing')
	}
	starts.push(start)
	finishes.push(finish)
	if (exitCode !== 0) failures.push(`${workload.name} exited ${exitCode}`)
}

try {
	await validateWorkloads(cwd, workloads, {
		start: new Date(Math.min(...starts)),
		finish: new Date(Math.max(...finishes)),
		failures,
	})
} catch (error) {
	if (!(error instanceof SloRunError)) throw error
	console.error(error.message)
	process.exitCode = 1
}
