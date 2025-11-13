// src/main.ts
import * as fs from 'node:fs'
import * as path from 'node:path'
import { DefaultArtifactClient } from '@actions/artifact'
import { debug, getInput as getInput2, info, saveState } from '@actions/core'
import { exec } from '@actions/exec'

// src/cfg/prom/config.yml
var config_default =
	'global:\n  scrape_interval: 1s\n  evaluation_interval: 1s\n\nscrape_configs:\n  - job_name: "pushgateway"\n    static_configs:\n      - targets:\n          - localhost:9091\n'

// src/cfg/ydb/erasure-none.yaml
var erasure_none_default =
	'actor_system_config:\n  cpu_count: 1\n  node_type: STORAGE\n  use_auto_config: true\nblob_storage_config:\n  service_set:\n    groups:\n      - erasure_species: none\n        rings:\n          - fail_domains:\n              - vdisk_locations:\n                  - node_id: 1\n                    path: SectorMap:1:64\n                    pdisk_category: SSD\nchannel_profile_config:\n  profile:\n    - channel:\n        - erasure_species: none\n          pdisk_category: 0\n          storage_pool_kind: ssd\n        - erasure_species: none\n          pdisk_category: 0\n          storage_pool_kind: ssd\n        - erasure_species: none\n          pdisk_category: 0\n          storage_pool_kind: ssd\n      profile_id: 0\ndomains_config:\n  domain:\n    - name: Root\n      storage_pool_types:\n        - kind: ssd\n          pool_config:\n            box_id: 1\n            erasure_species: none\n            kind: ssd\n            pdisk_filter:\n              - property:\n                  - type: SSD\n            vdisk_kind: Default\n  state_storage:\n    - ring:\n        node: [1]\n        nto_select: 1\n      ssid: 1\nhost_configs:\n  - drive:\n      - path: SectorMap:1:64\n        type: SSD\n    host_config_id: 1\nhosts:\n  - host: ${{ host }}\n    host_config_id: 1\n    node_id: 1\n    port: 19001\n    walle_location:\n      body: 1\n      data_center: az-1\n      rack: "0"\nstatic_erasure: none\n'

// src/chaos.sh
var chaos_default =
	'#!/bin/sh -e\n\nget_random_container() {\n    # Get a list of all containers starting with ydb-database-*\n    containers=$(docker ps --format \'{{.Names}}\' | grep \'^ydb-database-\')\n\n    # Convert the list to a newline-separated string\n    containers=$(echo "$containers" | tr \' \' \'\\n\')\n\n    # Count the number of containers\n    containersCount=$(echo "$containers" | wc -l)\n\n    # Generate a random number between 0 and containersCount - 1\n    randomIndex=$(shuf -i 0-$(($containersCount - 1)) -n 1)\n\n    # Get the container name at the random index\n    nodeForChaos=$(echo "$containers" | sed -n "$(($randomIndex + 1))p")\n}\n\nsleep 60\n\nget_random_container\nsh -c "docker stop ${nodeForChaos} -t 30"\nsh -c "docker start ${nodeForChaos}"\n\nsleep 60\n\nget_random_container\nsh -c "docker restart ${nodeForChaos} -t 0"\n\nsleep 60\n\nget_random_container\nsh -c "docker kill -s SIGKILL ${nodeForChaos}"\n\nsleep 60\n'

// src/constants.ts
var HOST = 'localhost',
	YDB_GRPC_PORT = 2135,
	YDB_MON_PORT = 8765,
	YDB_IC_PORT = 19001,
	YDB_TENANT = '/Root/testdb',
	PROMETHEUS_PORT = 9090,
	PROMETHEUS_PUSHGATEWAY_PORT = 9091,
	YDB_ENDPOINT = 'grpc://localhost:2135'
var PROMETHEUS_URL = 'http://localhost:9090'

// src/configs.ts
var generateStaticNode = () =>
		`
  static-0:
    <<: *ydb-node
    container_name: ydb-static-0
    command:
      - /opt/ydb/bin/ydbd
      - server
      - --grpc-port
      - "${YDB_GRPC_PORT}"
      - --mon-port
      - "${YDB_MON_PORT}"
      - --ic-port
      - "${YDB_IC_PORT}"
      - --yaml-config
      - /opt/ydb/cfg/config.yaml
      - --node
      - static
      - --label
      - deployment=docker
    ports:
      - ${YDB_GRPC_PORT}:${YDB_GRPC_PORT}
      - ${YDB_MON_PORT}:${YDB_MON_PORT}
      - ${YDB_IC_PORT}:${YDB_IC_PORT}
    healthcheck:
      test: bash -c "exec 6<> /dev/tcp/${HOST}/${YDB_GRPC_PORT}"
      interval: 10s
      timeout: 1s
      retries: 3
      start_period: 30s

  static-init:
    <<: *ydb-node
    restart: on-failure
    container_name: ydb-static-init
    command:
      - /opt/ydb/bin/ydbd
      - -s
      - ${YDB_ENDPOINT}
      - admin
      - blobstorage
      - config
      - init
      - --yaml-file
      - /opt/ydb/cfg/config.yaml
    depends_on:
      static-0:
        condition: service_healthy

  tenant-init:
    <<: *ydb-node
    restart: on-failure
    container_name: ydb-tenant-init
    command:
      - /opt/ydb/bin/ydbd
      - -s
      - ${YDB_ENDPOINT}
      - admin
      - database
      - ${YDB_TENANT}
      - create
      - ssd:1
    depends_on:
      static-init:
        condition: service_completed_successfully
`.slice(1),
	generateDatabaseNode = (idx) =>
		`
  database-${idx}:
    <<: *ydb-node
    container_name: ydb-database-${idx}
    command:
      - /opt/ydb/bin/ydbd
      - server
      - --grpc-port
      - "${YDB_GRPC_PORT + idx}"
      - --mon-port
      - "${YDB_MON_PORT + idx}"
      - --ic-port
      - "${YDB_IC_PORT + idx}"
      - --yaml-config
      - /opt/ydb/cfg/config.yaml
      - --tenant
      - ${YDB_TENANT}
      - --node-broker
      - ${YDB_ENDPOINT}
      - --label
      - deployment=docker
    ports:
      - ${YDB_GRPC_PORT + idx}:${YDB_GRPC_PORT + idx}
      - ${YDB_MON_PORT + idx}:${YDB_MON_PORT + idx}
      - ${YDB_IC_PORT + idx}:${YDB_IC_PORT + idx}
    healthcheck:
      test: bash -c "exec 6<> /dev/tcp/${HOST}/${YDB_GRPC_PORT + idx}"
      interval: 10s
      timeout: 1s
      retries: 3
      start_period: 30s
    depends_on:
      static-0:
        condition: service_healthy
      static-init:
        condition: service_completed_successfully
      tenant-init:
        condition: service_completed_successfully
`.slice(1),
	generateMonitoring = () =>
		`
  prometheus:
    image: prom/prometheus
    restart: unless-stopped
    <<: *runtime
    ports:
      - "${PROMETHEUS_PORT}:${PROMETHEUS_PORT}"
	command:
	  - "--web.enable-otlp-receiver"
	  - "--config.file=/etc/prometheus/prometheus.yml"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    deploy: &monitoring-deploy
      resources:
        limits:
          cpus: '0.1'
          memory: 1000M
        reservations:
          cpus: '0.001'
          memory: 50M

  prometheus-pushgateway:
    image: prom/pushgateway
    restart: unless-stopped
    <<: *runtime
    ports:
      - "${PROMETHEUS_PUSHGATEWAY_PORT}:${PROMETHEUS_PUSHGATEWAY_PORT}"
    deploy:
      <<: *monitoring-deploy
`.slice(1),
	generateChaos = () =>
		`
  chaos:
    image: docker
    restart: on-failure
    container_name: ydb-chaos
    <<: *runtime
    entrypoint: ["/bin/sh", "-c", "/opt/ydb/chaos.sh"]
    volumes:
      - ./chaos.sh:/opt/ydb/chaos.sh
      - /var/run/docker.sock:/var/run/docker.sock
`.slice(1),
	generateComposeFile = (ydbDatabaseNodeCount) => `# Code generated by Github Action; DO NOT EDIT.

x-runtime: &runtime
  platform: linux/amd64
  privileged: true
  network_mode: host

x-ydb-node: &ydb-node
  image: cr.yandex/crptqonuodf51kdj7a7d/ydb:24.4.4.12
  restart: always
  hostname: ${HOST}
  <<: *runtime
  volumes:
    - ./ydb.yaml:/opt/ydb/cfg/config.yaml

name: ydb

services:
${generateStaticNode()}
${Array.from({ length: ydbDatabaseNodeCount }, (_, i) => i + 1)
	.map(generateDatabaseNode)
	.join('\n')}
${generateMonitoring()}
${generateChaos()}
`
if (import.meta.url === new URL('./configs.ts', import.meta.url).href) console.log(generateComposeFile(5))

// src/pulls.ts
import { getInput } from '@actions/core'
import { context, getOctokit } from '@actions/github'
async function getPullRequestNumber() {
	let token = getInput('github_token') || process.env.GITHUB_TOKEN,
		prNumber = getInput('github_pull_request_number')
	if (prNumber.length > 0) return parseInt(prNumber)
	if (context.eventName === 'pull_request') return context.payload.pull_request.number
	if (token) {
		let octokit = getOctokit(token),
			branch = context.ref.replace('refs/heads/', ''),
			{ data: pulls } = await octokit.rest.pulls.list({
				state: 'open',
				owner: context.repo.owner,
				repo: context.repo.repo,
				head: `${context.actor}:${branch}`,
			})
		if (pulls.length > 0) return pulls[0].number
	}
	return null
}

// src/main.ts
async function main() {
	let cwd = path.join(process.cwd(), '.slo'),
		workload = getInput2('workload_name') || getInput2('sdk_name') || 'unspecified'
	;(saveState('cwd', cwd),
		saveState('workload', workload),
		debug('Creating working directory...'),
		fs.mkdirSync(cwd, { recursive: !0 }))
	PR: {
		info('Aquire pull request number...')
		let prNumber = (await getPullRequestNumber()) || -1
		if ((info(`Pull request number: ${prNumber}`), prNumber < 0)) break PR
		;(saveState('pull', prNumber), info('Writing pull number...'))
		let pullPath = path.join(cwd, `${workload}-pull.txt`)
		;(fs.writeFileSync(pullPath, prNumber.toFixed(0), { encoding: 'utf-8' }),
			info(`Pull number written to ${pullPath}`))
		let artifactClient = new DefaultArtifactClient()
		info('Upload pull number as an artifact...')
		let { id } = await artifactClient.uploadArtifact(`${workload}-pull.txt`, [pullPath], cwd, { retentionDays: 1 })
		info(`Pull number uploaded as an artifact ${id}`)
	}
	{
		info('Creating ydb config...')
		let configPath = path.join(cwd, 'ydb.yaml'),
			configContent = erasure_none_default.replaceAll('${{ host }}', HOST)
		;(fs.writeFileSync(configPath, configContent, { encoding: 'utf-8' }),
			info(`Created config for ydb: ${configPath}`))
	}
	{
		info('Creating prometheus config...')
		let configPath = path.join(cwd, 'prometheus.yml'),
			configContent = config_default.replace('${{ pushgateway }}', `${HOST}:${PROMETHEUS_PUSHGATEWAY_PORT}`)
		;(fs.writeFileSync(configPath, configContent, { encoding: 'utf-8' }),
			info(`Created config for prometheus: ${configPath}`))
	}
	{
		info('Creating chaos script...')
		let scriptPath = path.join(cwd, 'chaos.sh')
		;(fs.writeFileSync(scriptPath, chaos_default, { encoding: 'utf-8', mode: 493 }),
			info(`Created chaos script: ${scriptPath}`))
	}
	{
		info('Creating compose config...')
		let composePath = path.join(cwd, 'compose.yaml'),
			composeContent = generateComposeFile(parseInt(getInput2('ydb_database_node_count', { required: !0 })))
		;(fs.writeFileSync(composePath, composeContent, { encoding: 'utf-8' }),
			info(`Created compose.yaml: ${composePath}`))
	}
	;(info('Starting YDB...'),
		await exec('docker', ['compose', '-f', 'compose.yaml', 'up', '--quiet-pull', '-d'], { cwd }))
	let start = /* @__PURE__ */ new Date()
	;(info(`YDB started at ${start}`), saveState('start', start.toISOString()))
}
main()
