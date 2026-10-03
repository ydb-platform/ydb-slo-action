export interface ChaosScenario {
	readonly name: string
	readonly startedAt: string
	finishedAt?: string
	status: 'completed' | 'failed' | 'incomplete'
	exitCode?: number
}

export function parseChaosScenarios(logs: string): ChaosScenario[] {
	let scenarios: ChaosScenario[] = []
	let current: ChaosScenario | undefined

	for (let line of logs.split('\n')) {
		let record = line.match(/^\S*chaos\S*\s*\|\s*(?:\[([^\]]+)\]\s*)?(.*)$/)
		if (!record) continue
		let [, timestamp, message] = record
		let start = message.match(/^Running scenario: ([\w.-]+)$/)
		if (start && timestamp && Number.isFinite(Date.parse(timestamp))) {
			current = { name: start[1], startedAt: timestamp, status: 'incomplete' }
			scenarios.push(current)
			continue
		}
		if (!current) continue

		let finish = message.match(/^(Completed|Failed) scenario: ([\w.-]+)(?: \(exit (\d+)\))?$/)
		if (finish && finish[2] === current.name) {
			current.status = finish[1] === 'Completed' ? 'completed' : 'failed'
			if (timestamp && Number.isFinite(Date.parse(timestamp))) current.finishedAt = timestamp
			if (finish[3]) current.exitCode = Number(finish[3])
		} else if (/\bscenario completed$|^Rolling restart completed for all \d+ nodes$/.test(message)) {
			current.status = 'completed'
		}
	}

	return scenarios
}
