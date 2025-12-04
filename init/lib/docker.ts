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
