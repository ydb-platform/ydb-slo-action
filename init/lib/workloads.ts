import { debug, getInput, info, saveState, warning } from '@actions/core'

import { waitForContainerCompletion } from './docker.js'
import { type SloWorkload, validateWorkloads } from './slo.js'

export async function waitForWorkloads(cwd: string): Promise<void> {
	let start = new Date()
	saveState('start', start.toISOString())
	info(`Workloads started at ${start}`)

	let workloadCurrentImage = getInput('workload_current_image')
	let workloadBaselineImage = getInput('workload_baseline_image') || ''
	let workloadDuration = Number(getInput('workload_duration') || '60')
	let workloadTimeout = Number(getInput('workload_completion_timeout') || workloadDuration + 60)
	if (!Number.isSafeInteger(workloadDuration) || workloadDuration <= 0
		|| !Number.isSafeInteger(workloadTimeout) || workloadTimeout <= 0 || workloadTimeout > 2_147_483) {
		throw new Error('Workload duration and completion timeout must be positive integer seconds; timeout must fit the Node timer range')
	}
	let workloadTimeoutMs = workloadTimeout * 1000
	let failFast = getInput('fail_on_workload_error') === 'true'

	debug(
		`Workload configuration: duration=${workloadDuration}s, timeout=${workloadTimeoutMs}ms, failFast=${failFast}`
	)

	let workloadsToWait: SloWorkload[] = []
	if (workloadCurrentImage) {
		workloadsToWait.push({ name: 'current', container: 'ydb-workload-current', ref: getInput('workload_current_ref') || 'current' })
	}
	if (workloadBaselineImage) {
		workloadsToWait.push({ name: 'baseline', container: 'ydb-workload-baseline', ref: getInput('workload_baseline_ref') || 'baseline' })
	}

	let failures: string[] = []
	if (workloadsToWait.length > 0) {
		info(`Waiting for ${workloadsToWait.length} workload(s) to complete...`)
		info(`  - ${workloadsToWait.map((w) => w.name).join(', ')}`)
		info(`  - Total completion budget: ${workloadTimeout}s`)
		let results = await Promise.allSettled(
			workloadsToWait.map((w) =>
				waitForContainerCompletion({ container: w.container, timeoutMs: workloadTimeoutMs })
			)
		)
		results.forEach((result, i) => {
			if (result.status === 'rejected') {
				let name = workloadsToWait[i].name
				failures.push(`${name}: ${result.reason}`)
				warning(`Workload '${name}' failed: ${result.reason}`)
			}
		})
		if (failures.length === 0) info('All workloads completed successfully')
	}

	let finish = new Date()
	saveState('finish', finish.toISOString())
	info(`Workloads finished at ${finish}`)
	await validateWorkloads(cwd, workloadsToWait, { start, finish, failures })
	if (failFast && failures.length > 0) {
		throw new Error(`Workload(s) failed: ${failures.join('; ')}`)
	}
}
