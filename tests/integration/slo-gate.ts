import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { exec } from '@actions/exec'

import { SloRunError, validateWorkloads } from '../../init/lib/slo.js'

let cwd = path.join(process.cwd(), '.slo-probe')
await fs.mkdir(path.join(cwd, 'extra'), { recursive: true })
process.env['GITHUB_ACTION_PATH'] = process.cwd()
process.env['GITHUB_STEP_SUMMARY'] = path.join(cwd, 'summary.md')
await fs.writeFile(process.env['GITHUB_STEP_SUMMARY'], '')

let windowText = ''
await exec('docker', ['inspect', 'slo-v3-probe', '--format', '{{.State.StartedAt}}|{{.State.FinishedAt}}'], {
	listeners: { stdout: (data) => { windowText += data.toString() } },
})
let [start, finish] = windowText.trim().split('|')
if (!start || !finish) throw new Error('Probe execution window is missing')

try {
	await validateWorkloads(cwd, [{
		name: 'current',
		container: 'slo-v3-probe',
		ref: 'current',
	}], { start: new Date(start), finish: new Date(finish), failures: [] })
} catch (error) {
	if (!(error instanceof SloRunError)) throw error
	console.error(error.message)
	process.exitCode = 1
}
