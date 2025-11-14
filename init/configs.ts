import { execSync } from 'child_process'
import {
	HOST,
	PROMETHEUS_PORT,
	PROMETHEUS_PUSHGATEWAY_PORT,
	YDB_ENDPOINT,
	YDB_GRPC_PORT,
	YDB_IC_PORT,
	YDB_MON_PORT,
	YDB_TENANT,
} from './constants.js'

// Generate Compose file by using yq to duplicate and modify a template service
export let generateComposeFile = (ydbDatabaseNodeCount: number) => {
	const yqCommands: string[] = []

	for (let i = 1; i <= ydbDatabaseNodeCount; i++) {
		const grpcPort = YDB_GRPC_PORT + i
		const monPort = YDB_MON_PORT + i
		const icPort = YDB_IC_PORT + i
		const database = `.services.["database-${i}"]`

		// Copy the template service
		yqCommands.push(`${database} = .services.["_database_template_"]`)

		// Update unique properties
		yqCommands.push(`${database}.container_name = "ydb-database-${i}"`)

		// Update ports in the 'command' array using comments as reliable anchors
		yqCommands.push(`(${database}.command[] | select(line_comment == "GRPC_PORT")) = "${grpcPort}"`)
		yqCommands.push(`(${database}.command[] | select(line_comment == "MON_PORT")) = "${monPort}"`)
		yqCommands.push(`(${database}.command[] | select(line_comment == "IC_PORT")) = "${icPort}"`)

		// Update port mappings in the 'ports' array
		yqCommands.push(`(${database}.ports[] | select(line_comment == "GRPC_PORT_MAP")) = "${grpcPort}:${grpcPort}"`)
		yqCommands.push(`(${database}.ports[] | select(line_comment == "MON_PORT_MAP")) = "${monPort}:${monPort}"`)
		yqCommands.push(`(${database}.ports[] | select(line_comment == "IC_PORT_MAP")) = "${icPort}:${icPort}"`)

		// Update the healthcheck port using a simple direct path
		yqCommands.push(`${database}.healthcheck.test = "bash -c \\"exec 6<> /dev/tcp/${HOST}/${grpcPort}\\""`)
	}

	// Clean up by deleting the template
	yqCommands.push('del(.services.["_database_template_"])')

	// Substitute all ${...} variables with values from the environment
	yqCommands.push('.. style="" | (.. | select(tag == "!!str")) |= envsubst')

	const yqScript = yqCommands.join(' | ')
	const command = `yq eval '${yqScript}' ./init/cfg/compose.yml`

	return execSync(command, {
		env: {
			...process.env,
			HOST,
			PROMETHEUS_PORT: PROMETHEUS_PORT.toString(),
			PROMETHEUS_PUSHGATEWAY_PORT: PROMETHEUS_PUSHGATEWAY_PORT.toString(),
			YDB_TENANT,
			YDB_ENDPOINT,
			YDB_IC_PORT: YDB_IC_PORT.toString(),
			YDB_MON_PORT: YDB_MON_PORT.toString(),
			YDB_GRPC_PORT: YDB_GRPC_PORT.toString(),
		},
	}).toString()
}

if (import.meta.url === new URL('./configs.ts', import.meta.url).href) {
	console.log(generateComposeFile(2))
}
