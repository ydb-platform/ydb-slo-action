import { warning } from '@actions/core'
import { exec } from '@actions/exec'

export interface DockerEvent {
	status: string
	id: string
	from: string
	Type: string
	Action: string
	Actor: {
		ID: string
		Attributes: Record<string, string>
	}
	scope: string
	time: number
	timeNano: number
}

/**
 * Gets IP address of a Docker container
 */
export async function getContainerIp(containerName: string, cwd: string): Promise<string | null> {
	try {
		let chunks: string[] = []

		await exec(
			'docker',
			['inspect', '-f', '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}', containerName],
			{
				cwd,
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
 * Collects Docker events for YDB database nodes
 */
export async function collectDockerEvents(options: { cwd: string; since: Date; until: Date }): Promise<DockerEvent[]> {
	let events: DockerEvent[] = []

	try {
		let chunks: string[] = []

		await exec(
			`docker`,
			[
				`events`,
				`--filter`,
				`label=ydb.node.type=database`,
				`--filter`,
				`event=stop`,
				`--filter`,
				`event=start`,
				`--filter`,
				`event=kill`,
				`--filter`,
				`event=restart`,
				`--since`,
				options.since.toISOString(),
				`--until`,
				options.until.toISOString(),
				`--format`,
				`{{json .}}`,
			],
			{
				cwd: options.cwd,
				silent: true,
				listeners: {
					stdout: (data) => chunks.push(data.toString()),
				},
			}
		)

		let lines = chunks.join('').split('\n').filter(Boolean)
		for (let line of lines) {
			events.push(JSON.parse(line) as DockerEvent)
		}
	} catch (error) {
		warning(`Failed to collect Docker events: ${String(error)}`)
	}

	return events
}

/**
 * Stops Docker Compose project
 */
export async function stopCompose(cwd: string): Promise<void> {
	await exec(`docker`, [`compose`, `-f`, `compose.yml`, `down`], { cwd })
}
