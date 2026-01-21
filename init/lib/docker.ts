import { warning } from '@actions/core'
import { exec } from '@actions/exec'

export interface ContainerCopyOptions {
	container: string
	sourcePath: string
	destinationPath?: string
}

/**
 * Copies a file from a Docker container to stdout or a host path
 */
export async function copyFromContainer(options: ContainerCopyOptions): Promise<string | null> {
	let source = `${options.container}:${options.sourcePath}`

	try {
		if (options.destinationPath) {
			await exec('docker', ['cp', source, options.destinationPath], {
				silent: true,
			})

			return null
		}

		let chunks: string[] = []

		await exec('docker', ['cp', source, '-'], {
			silent: true,
			listeners: {
				stdout: (data) => chunks.push(data.toString()),
			},
		})

		return chunks.join('')
	} catch (error) {
		warning(`Failed to copy ${options.sourcePath} from ${options.container}: ${String(error)}`)
		return null
	}
}

/**
 * Gets IP address of a Docker container
 */
export async function getContainerIp(containerName: string): Promise<string | null> {
	try {
		let chunks: string[] = []

		//prettier-ignore
		await exec('docker', ['inspect', '-f', '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}', containerName],
			{
				silent: true,
				listeners: {
					stdout: (data) => chunks.push(data.toString()),
				},
			}
		)

		let ip = chunks.join('').trim()
		return ip || null
	} catch (error) {
		warning(`Failed to get container IP for ${containerName}: ${String(error)}`)
		return null
	}
}

/**
 * Collects logs from Docker Compose services
 */
export async function collectComposeLogs(cwd: string): Promise<string> {
	try {
		let chunks: string[] = []

		await exec(`docker`, [`compose`, `-f`, `compose.yml`, `logs`, `--no-color`], {
			cwd,
			silent: true,
			listeners: {
				stdout: (data) => chunks.push(data.toString()),
				stderr: (data) => chunks.push(data.toString()),
			},
		})

		return chunks.join('')
	} catch (error) {
		warning(`Failed to collect docker compose logs: ${String(error)}`)
		return ''
	}
}

/**
 * Gets all profiles defined in a Docker Compose file
 */
export async function getComposeProfiles(cwd: string): Promise<string[]> {
	try {
		let chunks: string[] = []

		await exec(`yq`, [`-r`, `.. | .profiles? | select(. != null) | .[]`, `compose.yml`], {
			cwd,
			silent: true,
			ignoreReturnCode: true,
			listeners: {
				stdout: (data) => chunks.push(data.toString()),
			},
		})

		let stdout = chunks.join('')
		let allProfiles = stdout.trim().split('\n').filter(Boolean)

		return [...new Set(allProfiles)]
	} catch (error) {
		warning(`Failed to detect profiles dynamically: ${String(error)}`)
		return []
	}
}

export interface WaitForHealthyOptions {
	containers: string[]
	timeoutMs?: number
	checkIntervalMs?: number
}

/**
 * Waits for Docker containers to become healthy
 */
export async function waitForHealthyContainers(options: WaitForHealthyOptions): Promise<void> {
	let { containers, timeoutMs = 120000, checkIntervalMs = 2000 } = options
	let startTime = Date.now()

	for (let container of containers) {
		while (true) {
			if (Date.now() - startTime > timeoutMs) {
				throw new Error(`Timeout waiting for container ${container} to become healthy`)
			}

			try {
				let chunks: string[] = []

				await exec('docker', ['inspect', '-f', '{{.State.Health.Status}}', container], {
					silent: true,
					listeners: {
						stdout: (data) => chunks.push(data.toString()),
					},
				})

				let healthStatus = chunks.join('').trim()

				if (healthStatus === 'healthy') {
					break
				}

				if (healthStatus === 'unhealthy') {
					warning(`Container ${container} is unhealthy, continuing to wait...`)
				}
			} catch (error) {
				// Container might not exist yet or doesn't have healthcheck
				warning(`Failed to check health status for ${container}: ${String(error)}`)
			}

			await new Promise((resolve) => setTimeout(resolve, checkIntervalMs))
		}
	}
}

export interface WaitForCompletionOptions {
	container: string
	timeoutMs?: number
}

/**
 * Waits for a Docker container to complete and checks exit code
 */
export async function waitForContainerCompletion(options: WaitForCompletionOptions): Promise<void> {
	let { container, timeoutMs = 120000 } = options

	try {
		let chunks: string[] = []
		let timeoutHandle: NodeJS.Timeout | null = null
		let completed = false

		let timeoutPromise = new Promise<never>((_, reject) => {
			timeoutHandle = setTimeout(() => {
				reject(new Error(`Timeout waiting for container ${container} to complete`))
			}, timeoutMs)
		})

		let waitPromise = exec('docker', ['wait', container], {
			silent: true,
			listeners: {
				stdout: (data) => chunks.push(data.toString()),
			},
		}).then(() => {
			completed = true
			if (timeoutHandle) clearTimeout(timeoutHandle)
		})

		await Promise.race([waitPromise, timeoutPromise])

		if (!completed) {
			throw new Error(`Container ${container} did not complete in time`)
		}

		let exitCode = parseInt(chunks.join('').trim(), 10)

		if (exitCode !== 0) {
			throw new Error(`Container ${container} exited with code ${exitCode}`)
		}
	} catch (error) {
		throw new Error(`Failed to wait for container ${container}: ${String(error)}`)
	}
}
