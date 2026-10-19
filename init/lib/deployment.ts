import { info, warning } from '@actions/core'
import { exec, getExecOutput } from '@actions/exec'

interface ComposeDeployment {
	readonly cwd: string
	readonly composeFile: string
	readonly env: Record<string, string>
	readonly timeoutSeconds: number
}

export async function deployCompose(options: ComposeDeployment): Promise<void> {
	if (!Number.isSafeInteger(options.timeoutSeconds) || options.timeoutSeconds <= 0) {
		throw new Error('deployment_timeout must be a positive integer in seconds')
	}
	let deadline = Date.now() + options.timeoutSeconds * 1000
	let timed = (args: string[]) => {
		let remaining = Math.ceil((deadline - Date.now()) / 1000)
		if (remaining <= 0) throw new Error('Compose deployment budget expired')
		return ['--kill-after=30s', `${remaining}s`, ...args]
	}
	let compose = ['docker', 'compose', '--progress', 'plain', '-f', options.composeFile]
	let execution = { cwd: options.cwd, env: options.env }
	let config = await getExecOutput('timeout', timed([...compose, 'config', '--format', 'json']), {
		...execution,
		silent: true,
	})
	let services = (
		JSON.parse(config.stdout) as {
			services: Record<string, { image?: string; build?: unknown; pull_policy?: string }>
		}
	).services
	let missing: string[] = []
	for (let [name, service] of Object.entries(services)) {
		if (!service.image || service.build || service.pull_policy === 'never') continue
		let image = await getExecOutput(
			'timeout',
			timed(['docker', 'image', 'inspect', service.image]),
			{
				...execution,
				silent: true,
				ignoreReturnCode: true,
			}
		)
		if (image.exitCode === 1) missing.push(name)
		else if (image.exitCode !== 0)
			throw new Error(`Image inspection exited with code ${image.exitCode}`)
	}
	let stages = [
		...(missing.length
			? [['pull', '--ignore-buildable', '--policy', 'missing', ...missing]]
			: []),
		['build'],
		['up', '--no-build', '--pull', 'never', '--detach'],
	]
	for (let stage of stages) {
		for (let attempt = 1; attempt <= 3; attempt++) {
			let remaining = Math.ceil((deadline - Date.now()) / 1000)
			if (remaining <= 0) throw new Error('Compose deployment budget expired')
			info(`Compose ${stage[0]}: attempt ${attempt}/3, ${remaining}s remaining`)
			try {
				await exec('timeout', timed([...compose, ...stage]), execution)
				break
			} catch (error) {
				if (attempt === 3 || Date.now() >= deadline) throw error
				warning(`Compose ${stage[0]} attempt ${attempt} failed: ${String(error)}`)
			}
		}
	}
}
