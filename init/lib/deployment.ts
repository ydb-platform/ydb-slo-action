import { info, warning } from '@actions/core'
import { exec } from '@actions/exec'

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
	let stages = [
		['pull', '--ignore-buildable', '--policy', 'missing'],
		['build'],
		['up', '--no-build', '--pull', 'never', '--detach'],
	]
	for (let stage of stages) {
		for (let attempt = 1; attempt <= 3; attempt++) {
			let remaining = Math.ceil((deadline - Date.now()) / 1000)
			if (remaining <= 0) throw new Error('Compose deployment budget expired')
			info(`Compose ${stage[0]}: attempt ${attempt}/3, ${remaining}s remaining`)
			try {
				await exec(
					'timeout',
					[
						'--kill-after=30s',
						`${remaining}s`,
						'docker',
						'compose',
						'--progress',
						'plain',
						'-f',
						options.composeFile,
						...stage,
					],
					{ cwd: options.cwd, env: options.env }
				)
				break
			} catch (error) {
				if (attempt === 3 || Date.now() >= deadline) throw error
				warning(`Compose ${stage[0]} attempt ${attempt} failed: ${String(error)}`)
			}
		}
	}
}
