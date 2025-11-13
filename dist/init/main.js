import {
  HOST,
  PROMETHEUS_PORT,
  PROMETHEUS_PUSHGATEWAY_PORT,
  YDB_ENDPOINT,
  YDB_GRPC_PORT,
  YDB_IC_PORT,
  YDB_MON_PORT,
  YDB_TENANT
} from "../main-kv88d080.js";
import {
  require_github
} from "../main-wbgnj5tc.js";
import {
  __toESM,
  require_artifact,
  require_core,
  require_exec
} from "../main-ffb4ngs0.js";

// init/main.ts
var import_artifact = __toESM(require_artifact(), 1), import_core2 = __toESM(require_core(), 1), import_exec = __toESM(require_exec(), 1);
import * as fs from "node:fs";
import * as path from "node:path";

// init/cfg/prom/config.yml
var config_default = "global:\n  scrape_interval: 1s\n  evaluation_interval: 1s\n\nscrape_configs:\n  - job_name: \"pushgateway\"\n    static_configs:\n      - targets:\n          - localhost:9091\n";

// init/cfg/ydb/erasure-none.yaml
var erasure_none_default = "actor_system_config:\n  cpu_count: 1\n  node_type: STORAGE\n  use_auto_config: true\nblob_storage_config:\n  service_set:\n    groups:\n      - erasure_species: none\n        rings:\n          - fail_domains:\n              - vdisk_locations:\n                  - node_id: 1\n                    path: SectorMap:1:64\n                    pdisk_category: SSD\nchannel_profile_config:\n  profile:\n    - channel:\n        - erasure_species: none\n          pdisk_category: 0\n          storage_pool_kind: ssd\n        - erasure_species: none\n          pdisk_category: 0\n          storage_pool_kind: ssd\n        - erasure_species: none\n          pdisk_category: 0\n          storage_pool_kind: ssd\n      profile_id: 0\ndomains_config:\n  domain:\n    - name: Root\n      storage_pool_types:\n        - kind: ssd\n          pool_config:\n            box_id: 1\n            erasure_species: none\n            kind: ssd\n            pdisk_filter:\n              - property:\n                  - type: SSD\n            vdisk_kind: Default\n  state_storage:\n    - ring:\n        node: [1]\n        nto_select: 1\n      ssid: 1\nhost_configs:\n  - drive:\n      - path: SectorMap:1:64\n        type: SSD\n    host_config_id: 1\nhosts:\n  - host: ${{ host }}\n    host_config_id: 1\n    node_id: 1\n    port: 19001\n    walle_location:\n      body: 1\n      data_center: az-1\n      rack: \"0\"\nstatic_erasure: none\n";

// init/chaos.sh
var chaos_default = "#!/bin/sh -e\n\nget_random_container() {\n    # Get a list of all containers starting with ydb-database-*\n    containers=$(docker ps --format '{{.Names}}' | grep '^ydb-database-')\n\n    # Convert the list to a newline-separated string\n    containers=$(echo \"$containers\" | tr ' ' '\\n')\n\n    # Count the number of containers\n    containersCount=$(echo \"$containers\" | wc -l)\n\n    # Generate a random number between 0 and containersCount - 1\n    randomIndex=$(shuf -i 0-$(($containersCount - 1)) -n 1)\n\n    # Get the container name at the random index\n    nodeForChaos=$(echo \"$containers\" | sed -n \"$(($randomIndex + 1))p\")\n}\n\nsleep 60\n\nget_random_container\nsh -c \"docker stop ${nodeForChaos} -t 30\"\nsh -c \"docker start ${nodeForChaos}\"\n\nsleep 60\n\nget_random_container\nsh -c \"docker restart ${nodeForChaos} -t 0\"\n\nsleep 60\n\nget_random_container\nsh -c \"docker kill -s SIGKILL ${nodeForChaos}\"\n\nsleep 60\n";

// init/configs.ts
var generateStaticNode = () => `
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
`.slice(1), generateDatabaseNode = (idx) => `
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
`.slice(1), generateMonitoring = () => `
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
`.slice(1), generateChaos = () => `
  chaos:
    image: docker
    restart: on-failure
    container_name: ydb-chaos
    <<: *runtime
    entrypoint: ["/bin/sh", "-c", "/opt/ydb/chaos.sh"]
    volumes:
      - ./chaos.sh:/opt/ydb/chaos.sh
      - /var/run/docker.sock:/var/run/docker.sock
`.slice(1), generateComposeFile = (ydbDatabaseNodeCount) => `# Code generated by Github Action; DO NOT EDIT.

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
${Array.from({ length: ydbDatabaseNodeCount }, (_, i) => i + 1).map(generateDatabaseNode).join("\n")}
${generateMonitoring()}
${generateChaos()}
`;
if (import.meta.url === new URL("./configs.ts", import.meta.url).href)
  console.log(generateComposeFile(5));

// init/pulls.ts
var import_core = __toESM(require_core(), 1), import_github = __toESM(require_github(), 1);
async function getPullRequestNumber() {
  let token = import_core.getInput("github_token") || process.env.GITHUB_TOKEN, prNumber = import_core.getInput("github_pull_request_number");
  if (prNumber.length > 0)
    return parseInt(prNumber);
  if (import_github.context.eventName === "pull_request")
    return import_github.context.payload.pull_request.number;
  if (token) {
    let octokit = import_github.getOctokit(token), branch = import_github.context.ref.replace("refs/heads/", ""), { data: pulls } = await octokit.rest.pulls.list({
      state: "open",
      owner: import_github.context.repo.owner,
      repo: import_github.context.repo.repo,
      head: `${import_github.context.actor}:${branch}`
    });
    if (pulls.length > 0)
      return pulls[0].number;
  }
  return null;
}

// init/main.ts
async function main() {
  let cwd = path.join(process.cwd(), ".slo"), workload = import_core2.getInput("workload_name") || import_core2.getInput("sdk_name") || "unspecified";
  import_core2.saveState("cwd", cwd), import_core2.saveState("workload", workload), import_core2.debug("Creating working directory..."), fs.mkdirSync(cwd, { recursive: !0 });
  PR: {
    import_core2.info("Aquire pull request number...");
    let prNumber = await getPullRequestNumber() || -1;
    if (import_core2.info(`Pull request number: ${prNumber}`), prNumber < 0)
      break PR;
    import_core2.saveState("pull", prNumber), import_core2.info("Writing pull number...");
    let pullPath = path.join(cwd, `${workload}-pull.txt`);
    fs.writeFileSync(pullPath, prNumber.toFixed(0), { encoding: "utf-8" }), import_core2.info(`Pull number written to ${pullPath}`);
    let artifactClient = new import_artifact.DefaultArtifactClient;
    import_core2.info("Upload pull number as an artifact...");
    let { id } = await artifactClient.uploadArtifact(`${workload}-pull.txt`, [pullPath], cwd, { retentionDays: 1 });
    import_core2.info(`Pull number uploaded as an artifact ${id}`);
  }
  {
    import_core2.info("Creating ydb config...");
    let configPath = path.join(cwd, "ydb.yaml"), configContent = erasure_none_default.replaceAll("${{ host }}", HOST);
    fs.writeFileSync(configPath, configContent, { encoding: "utf-8" }), import_core2.info(`Created config for ydb: ${configPath}`);
  }
  {
    import_core2.info("Creating prometheus config...");
    let configPath = path.join(cwd, "prometheus.yml"), configContent = config_default.replace("${{ pushgateway }}", `${HOST}:${PROMETHEUS_PUSHGATEWAY_PORT}`);
    fs.writeFileSync(configPath, configContent, { encoding: "utf-8" }), import_core2.info(`Created config for prometheus: ${configPath}`);
  }
  {
    import_core2.info("Creating chaos script...");
    let scriptPath = path.join(cwd, "chaos.sh");
    fs.writeFileSync(scriptPath, chaos_default, { encoding: "utf-8", mode: 493 }), import_core2.info(`Created chaos script: ${scriptPath}`);
  }
  {
    import_core2.info("Creating compose config...");
    let composePath = path.join(cwd, "compose.yaml"), composeContent = generateComposeFile(parseInt(import_core2.getInput("ydb_database_node_count", { required: !0 })));
    fs.writeFileSync(composePath, composeContent, { encoding: "utf-8" }), import_core2.info(`Created compose.yaml: ${composePath}`);
  }
  import_core2.info("Starting YDB..."), await import_exec.exec("docker", ["compose", "-f", "compose.yaml", "up", "--quiet-pull", "-d"], { cwd });
  let start = /* @__PURE__ */ new Date;
  import_core2.info(`YDB started at ${start}`), import_core2.saveState("start", start.toISOString());
}
main();

//# debugId=B873B88537613BA864756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vaW5pdC9tYWluLnRzIiwgIi4uL2luaXQvY29uZmlncy50cyIsICIuLi9pbml0L3B1bGxzLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWwogICAgImltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ25vZGU6cGF0aCdcblxuaW1wb3J0IHsgRGVmYXVsdEFydGlmYWN0Q2xpZW50IH0gZnJvbSAnQGFjdGlvbnMvYXJ0aWZhY3QnXG5pbXBvcnQgeyBkZWJ1ZywgZ2V0SW5wdXQsIGluZm8sIHNhdmVTdGF0ZSB9IGZyb20gJ0BhY3Rpb25zL2NvcmUnXG5pbXBvcnQgeyBleGVjIH0gZnJvbSAnQGFjdGlvbnMvZXhlYydcblxuaW1wb3J0IHByb21ldGhldXNDb25maWcgZnJvbSAnLi9jZmcvcHJvbS9jb25maWcueW1sJyB3aXRoIHsgdHlwZTogJ3RleHQnIH1cbmltcG9ydCB5ZGJDb25maWcgZnJvbSAnLi9jZmcveWRiL2VyYXN1cmUtbm9uZS55YW1sJyB3aXRoIHsgdHlwZTogJ3RleHQnIH1cbmltcG9ydCBjaGFvcyBmcm9tICcuL2NoYW9zLnNoJyB3aXRoIHsgdHlwZTogJ3RleHQnIH1cblxuaW1wb3J0IHsgZ2VuZXJhdGVDb21wb3NlRmlsZSB9IGZyb20gJy4vY29uZmlncy5qcydcbmltcG9ydCB7IEhPU1QsIFBST01FVEhFVVNfUFVTSEdBVEVXQVlfUE9SVCB9IGZyb20gJy4vY29uc3RhbnRzLmpzJ1xuaW1wb3J0IHsgZ2V0UHVsbFJlcXVlc3ROdW1iZXIgfSBmcm9tICcuL3B1bGxzLmpzJ1xuXG5hc3luYyBmdW5jdGlvbiBtYWluKCkge1xuXHRsZXQgY3dkID0gcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksICcuc2xvJylcblx0bGV0IHdvcmtsb2FkID0gZ2V0SW5wdXQoJ3dvcmtsb2FkX25hbWUnKSB8fCBnZXRJbnB1dCgnc2RrX25hbWUnKSB8fCAndW5zcGVjaWZpZWQnXG5cblx0c2F2ZVN0YXRlKCdjd2QnLCBjd2QpXG5cdHNhdmVTdGF0ZSgnd29ya2xvYWQnLCB3b3JrbG9hZClcblxuXHRkZWJ1ZygnQ3JlYXRpbmcgd29ya2luZyBkaXJlY3RvcnkuLi4nKVxuXHRmcy5ta2RpclN5bmMoY3dkLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KVxuXG5cdFBSOiB7XG5cdFx0aW5mbygnQXF1aXJlIHB1bGwgcmVxdWVzdCBudW1iZXIuLi4nKVxuXHRcdGxldCBwck51bWJlciA9IChhd2FpdCBnZXRQdWxsUmVxdWVzdE51bWJlcigpKSB8fCAtMVxuXHRcdGluZm8oYFB1bGwgcmVxdWVzdCBudW1iZXI6ICR7cHJOdW1iZXJ9YClcblxuXHRcdGlmIChwck51bWJlciA8IDApIHtcblx0XHRcdGJyZWFrIFBSXG5cdFx0fVxuXG5cdFx0c2F2ZVN0YXRlKCdwdWxsJywgcHJOdW1iZXIpXG5cblx0XHRpbmZvKCdXcml0aW5nIHB1bGwgbnVtYmVyLi4uJylcblx0XHRsZXQgcHVsbFBhdGggPSBwYXRoLmpvaW4oY3dkLCBgJHt3b3JrbG9hZH0tcHVsbC50eHRgKVxuXHRcdGZzLndyaXRlRmlsZVN5bmMocHVsbFBhdGgsIHByTnVtYmVyLnRvRml4ZWQoMCksIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSlcblx0XHRpbmZvKGBQdWxsIG51bWJlciB3cml0dGVuIHRvICR7cHVsbFBhdGh9YClcblxuXHRcdGxldCBhcnRpZmFjdENsaWVudCA9IG5ldyBEZWZhdWx0QXJ0aWZhY3RDbGllbnQoKVxuXG5cdFx0aW5mbygnVXBsb2FkIHB1bGwgbnVtYmVyIGFzIGFuIGFydGlmYWN0Li4uJylcblx0XHRsZXQgeyBpZCB9ID0gYXdhaXQgYXJ0aWZhY3RDbGllbnQudXBsb2FkQXJ0aWZhY3QoYCR7d29ya2xvYWR9LXB1bGwudHh0YCwgW3B1bGxQYXRoXSwgY3dkLCB7IHJldGVudGlvbkRheXM6IDEgfSlcblx0XHRpbmZvKGBQdWxsIG51bWJlciB1cGxvYWRlZCBhcyBhbiBhcnRpZmFjdCAke2lkfWApXG5cdH1cblxuXHR7XG5cdFx0aW5mbygnQ3JlYXRpbmcgeWRiIGNvbmZpZy4uLicpXG5cdFx0bGV0IGNvbmZpZ1BhdGggPSBwYXRoLmpvaW4oY3dkLCAneWRiLnlhbWwnKVxuXHRcdGxldCBjb25maWdDb250ZW50ID0geWRiQ29uZmlnLnJlcGxhY2VBbGwoJyR7eyBob3N0IH19JywgSE9TVClcblxuXHRcdGZzLndyaXRlRmlsZVN5bmMoY29uZmlnUGF0aCwgY29uZmlnQ29udGVudCwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KVxuXHRcdGluZm8oYENyZWF0ZWQgY29uZmlnIGZvciB5ZGI6ICR7Y29uZmlnUGF0aH1gKVxuXHR9XG5cblx0e1xuXHRcdGluZm8oJ0NyZWF0aW5nIHByb21ldGhldXMgY29uZmlnLi4uJylcblx0XHRsZXQgY29uZmlnUGF0aCA9IHBhdGguam9pbihjd2QsICdwcm9tZXRoZXVzLnltbCcpXG5cdFx0bGV0IGNvbmZpZ0NvbnRlbnQgPSBwcm9tZXRoZXVzQ29uZmlnLnJlcGxhY2UoJyR7eyBwdXNoZ2F0ZXdheSB9fScsIGAke0hPU1R9OiR7UFJPTUVUSEVVU19QVVNIR0FURVdBWV9QT1JUfWApXG5cblx0XHRmcy53cml0ZUZpbGVTeW5jKGNvbmZpZ1BhdGgsIGNvbmZpZ0NvbnRlbnQsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSlcblx0XHRpbmZvKGBDcmVhdGVkIGNvbmZpZyBmb3IgcHJvbWV0aGV1czogJHtjb25maWdQYXRofWApXG5cdH1cblxuXHR7XG5cdFx0aW5mbygnQ3JlYXRpbmcgY2hhb3Mgc2NyaXB0Li4uJylcblx0XHRsZXQgc2NyaXB0UGF0aCA9IHBhdGguam9pbihjd2QsICdjaGFvcy5zaCcpXG5cblx0XHRmcy53cml0ZUZpbGVTeW5jKHNjcmlwdFBhdGgsIGNoYW9zLCB7IGVuY29kaW5nOiAndXRmLTgnLCBtb2RlOiAwbzc1NSB9KVxuXHRcdGluZm8oYENyZWF0ZWQgY2hhb3Mgc2NyaXB0OiAke3NjcmlwdFBhdGh9YClcblx0fVxuXG5cdHtcblx0XHRpbmZvKCdDcmVhdGluZyBjb21wb3NlIGNvbmZpZy4uLicpXG5cdFx0bGV0IGNvbXBvc2VQYXRoID0gcGF0aC5qb2luKGN3ZCwgJ2NvbXBvc2UueWFtbCcpXG5cdFx0bGV0IGNvbXBvc2VDb250ZW50ID0gZ2VuZXJhdGVDb21wb3NlRmlsZShwYXJzZUludChnZXRJbnB1dCgneWRiX2RhdGFiYXNlX25vZGVfY291bnQnLCB7IHJlcXVpcmVkOiB0cnVlIH0pKSlcblxuXHRcdGZzLndyaXRlRmlsZVN5bmMoY29tcG9zZVBhdGgsIGNvbXBvc2VDb250ZW50LCB7IGVuY29kaW5nOiAndXRmLTgnIH0pXG5cdFx0aW5mbyhgQ3JlYXRlZCBjb21wb3NlLnlhbWw6ICR7Y29tcG9zZVBhdGh9YClcblx0fVxuXG5cdGluZm8oJ1N0YXJ0aW5nIFlEQi4uLicpXG5cdGF3YWl0IGV4ZWMoYGRvY2tlcmAsIFtgY29tcG9zZWAsIGAtZmAsIGBjb21wb3NlLnlhbWxgLCBgdXBgLCBgLS1xdWlldC1wdWxsYCwgYC1kYF0sIHsgY3dkIH0pXG5cblx0bGV0IHN0YXJ0ID0gbmV3IERhdGUoKVxuXHRpbmZvKGBZREIgc3RhcnRlZCBhdCAke3N0YXJ0fWApXG5cdHNhdmVTdGF0ZSgnc3RhcnQnLCBzdGFydC50b0lTT1N0cmluZygpKVxufVxuXG5tYWluKClcbiIsCiAgICAiaW1wb3J0IHtcblx0SE9TVCxcblx0UFJPTUVUSEVVU19QT1JULFxuXHRQUk9NRVRIRVVTX1BVU0hHQVRFV0FZX1BPUlQsXG5cdFlEQl9FTkRQT0lOVCxcblx0WURCX0dSUENfUE9SVCxcblx0WURCX0lDX1BPUlQsXG5cdFlEQl9NT05fUE9SVCxcblx0WURCX1RFTkFOVCxcbn0gZnJvbSAnLi9jb25zdGFudHMuanMnXG5cbi8vIEdlbmVyYXRlIFlEQiBTdGF0aWMgTm9kZVxubGV0IGdlbmVyYXRlU3RhdGljTm9kZSA9ICgpID0+XG5cdGBcbiAgc3RhdGljLTA6XG4gICAgPDw6ICp5ZGItbm9kZVxuICAgIGNvbnRhaW5lcl9uYW1lOiB5ZGItc3RhdGljLTBcbiAgICBjb21tYW5kOlxuICAgICAgLSAvb3B0L3lkYi9iaW4veWRiZFxuICAgICAgLSBzZXJ2ZXJcbiAgICAgIC0gLS1ncnBjLXBvcnRcbiAgICAgIC0gXCIke1lEQl9HUlBDX1BPUlR9XCJcbiAgICAgIC0gLS1tb24tcG9ydFxuICAgICAgLSBcIiR7WURCX01PTl9QT1JUfVwiXG4gICAgICAtIC0taWMtcG9ydFxuICAgICAgLSBcIiR7WURCX0lDX1BPUlR9XCJcbiAgICAgIC0gLS15YW1sLWNvbmZpZ1xuICAgICAgLSAvb3B0L3lkYi9jZmcvY29uZmlnLnlhbWxcbiAgICAgIC0gLS1ub2RlXG4gICAgICAtIHN0YXRpY1xuICAgICAgLSAtLWxhYmVsXG4gICAgICAtIGRlcGxveW1lbnQ9ZG9ja2VyXG4gICAgcG9ydHM6XG4gICAgICAtICR7WURCX0dSUENfUE9SVH06JHtZREJfR1JQQ19QT1JUfVxuICAgICAgLSAke1lEQl9NT05fUE9SVH06JHtZREJfTU9OX1BPUlR9XG4gICAgICAtICR7WURCX0lDX1BPUlR9OiR7WURCX0lDX1BPUlR9XG4gICAgaGVhbHRoY2hlY2s6XG4gICAgICB0ZXN0OiBiYXNoIC1jIFwiZXhlYyA2PD4gL2Rldi90Y3AvJHtIT1NUfS8ke1lEQl9HUlBDX1BPUlR9XCJcbiAgICAgIGludGVydmFsOiAxMHNcbiAgICAgIHRpbWVvdXQ6IDFzXG4gICAgICByZXRyaWVzOiAzXG4gICAgICBzdGFydF9wZXJpb2Q6IDMwc1xuXG4gIHN0YXRpYy1pbml0OlxuICAgIDw8OiAqeWRiLW5vZGVcbiAgICByZXN0YXJ0OiBvbi1mYWlsdXJlXG4gICAgY29udGFpbmVyX25hbWU6IHlkYi1zdGF0aWMtaW5pdFxuICAgIGNvbW1hbmQ6XG4gICAgICAtIC9vcHQveWRiL2Jpbi95ZGJkXG4gICAgICAtIC1zXG4gICAgICAtICR7WURCX0VORFBPSU5UfVxuICAgICAgLSBhZG1pblxuICAgICAgLSBibG9ic3RvcmFnZVxuICAgICAgLSBjb25maWdcbiAgICAgIC0gaW5pdFxuICAgICAgLSAtLXlhbWwtZmlsZVxuICAgICAgLSAvb3B0L3lkYi9jZmcvY29uZmlnLnlhbWxcbiAgICBkZXBlbmRzX29uOlxuICAgICAgc3RhdGljLTA6XG4gICAgICAgIGNvbmRpdGlvbjogc2VydmljZV9oZWFsdGh5XG5cbiAgdGVuYW50LWluaXQ6XG4gICAgPDw6ICp5ZGItbm9kZVxuICAgIHJlc3RhcnQ6IG9uLWZhaWx1cmVcbiAgICBjb250YWluZXJfbmFtZTogeWRiLXRlbmFudC1pbml0XG4gICAgY29tbWFuZDpcbiAgICAgIC0gL29wdC95ZGIvYmluL3lkYmRcbiAgICAgIC0gLXNcbiAgICAgIC0gJHtZREJfRU5EUE9JTlR9XG4gICAgICAtIGFkbWluXG4gICAgICAtIGRhdGFiYXNlXG4gICAgICAtICR7WURCX1RFTkFOVH1cbiAgICAgIC0gY3JlYXRlXG4gICAgICAtIHNzZDoxXG4gICAgZGVwZW5kc19vbjpcbiAgICAgIHN0YXRpYy1pbml0OlxuICAgICAgICBjb25kaXRpb246IHNlcnZpY2VfY29tcGxldGVkX3N1Y2Nlc3NmdWxseVxuYC5zbGljZSgxKVxuXG4vLyBHZW5lcmF0ZSBZREIgRGF0YWJhc2UgTm9kZVxubGV0IGdlbmVyYXRlRGF0YWJhc2VOb2RlID0gKGlkeDogbnVtYmVyKSA9PlxuXHRgXG4gIGRhdGFiYXNlLSR7aWR4fTpcbiAgICA8PDogKnlkYi1ub2RlXG4gICAgY29udGFpbmVyX25hbWU6IHlkYi1kYXRhYmFzZS0ke2lkeH1cbiAgICBjb21tYW5kOlxuICAgICAgLSAvb3B0L3lkYi9iaW4veWRiZFxuICAgICAgLSBzZXJ2ZXJcbiAgICAgIC0gLS1ncnBjLXBvcnRcbiAgICAgIC0gXCIke1lEQl9HUlBDX1BPUlQgKyBpZHh9XCJcbiAgICAgIC0gLS1tb24tcG9ydFxuICAgICAgLSBcIiR7WURCX01PTl9QT1JUICsgaWR4fVwiXG4gICAgICAtIC0taWMtcG9ydFxuICAgICAgLSBcIiR7WURCX0lDX1BPUlQgKyBpZHh9XCJcbiAgICAgIC0gLS15YW1sLWNvbmZpZ1xuICAgICAgLSAvb3B0L3lkYi9jZmcvY29uZmlnLnlhbWxcbiAgICAgIC0gLS10ZW5hbnRcbiAgICAgIC0gJHtZREJfVEVOQU5UfVxuICAgICAgLSAtLW5vZGUtYnJva2VyXG4gICAgICAtICR7WURCX0VORFBPSU5UfVxuICAgICAgLSAtLWxhYmVsXG4gICAgICAtIGRlcGxveW1lbnQ9ZG9ja2VyXG4gICAgcG9ydHM6XG4gICAgICAtICR7WURCX0dSUENfUE9SVCArIGlkeH06JHtZREJfR1JQQ19QT1JUICsgaWR4fVxuICAgICAgLSAke1lEQl9NT05fUE9SVCArIGlkeH06JHtZREJfTU9OX1BPUlQgKyBpZHh9XG4gICAgICAtICR7WURCX0lDX1BPUlQgKyBpZHh9OiR7WURCX0lDX1BPUlQgKyBpZHh9XG4gICAgaGVhbHRoY2hlY2s6XG4gICAgICB0ZXN0OiBiYXNoIC1jIFwiZXhlYyA2PD4gL2Rldi90Y3AvJHtIT1NUfS8ke1lEQl9HUlBDX1BPUlQgKyBpZHh9XCJcbiAgICAgIGludGVydmFsOiAxMHNcbiAgICAgIHRpbWVvdXQ6IDFzXG4gICAgICByZXRyaWVzOiAzXG4gICAgICBzdGFydF9wZXJpb2Q6IDMwc1xuICAgIGRlcGVuZHNfb246XG4gICAgICBzdGF0aWMtMDpcbiAgICAgICAgY29uZGl0aW9uOiBzZXJ2aWNlX2hlYWx0aHlcbiAgICAgIHN0YXRpYy1pbml0OlxuICAgICAgICBjb25kaXRpb246IHNlcnZpY2VfY29tcGxldGVkX3N1Y2Nlc3NmdWxseVxuICAgICAgdGVuYW50LWluaXQ6XG4gICAgICAgIGNvbmRpdGlvbjogc2VydmljZV9jb21wbGV0ZWRfc3VjY2Vzc2Z1bGx5XG5gLnNsaWNlKDEpXG5cbi8vIEdlbmVyYXRlIE1vbml0b3JpbmdcbmxldCBnZW5lcmF0ZU1vbml0b3JpbmcgPSAoKSA9PlxuXHRgXG4gIHByb21ldGhldXM6XG4gICAgaW1hZ2U6IHByb20vcHJvbWV0aGV1c1xuICAgIHJlc3RhcnQ6IHVubGVzcy1zdG9wcGVkXG4gICAgPDw6ICpydW50aW1lXG4gICAgcG9ydHM6XG4gICAgICAtIFwiJHtQUk9NRVRIRVVTX1BPUlR9OiR7UFJPTUVUSEVVU19QT1JUfVwiXG5cdGNvbW1hbmQ6XG5cdCAgLSBcIi0td2ViLmVuYWJsZS1vdGxwLXJlY2VpdmVyXCJcblx0ICAtIFwiLS1jb25maWcuZmlsZT0vZXRjL3Byb21ldGhldXMvcHJvbWV0aGV1cy55bWxcIlxuICAgIHZvbHVtZXM6XG4gICAgICAtIC4vcHJvbWV0aGV1cy55bWw6L2V0Yy9wcm9tZXRoZXVzL3Byb21ldGhldXMueW1sXG4gICAgZGVwbG95OiAmbW9uaXRvcmluZy1kZXBsb3lcbiAgICAgIHJlc291cmNlczpcbiAgICAgICAgbGltaXRzOlxuICAgICAgICAgIGNwdXM6ICcwLjEnXG4gICAgICAgICAgbWVtb3J5OiAxMDAwTVxuICAgICAgICByZXNlcnZhdGlvbnM6XG4gICAgICAgICAgY3B1czogJzAuMDAxJ1xuICAgICAgICAgIG1lbW9yeTogNTBNXG5cbiAgcHJvbWV0aGV1cy1wdXNoZ2F0ZXdheTpcbiAgICBpbWFnZTogcHJvbS9wdXNoZ2F0ZXdheVxuICAgIHJlc3RhcnQ6IHVubGVzcy1zdG9wcGVkXG4gICAgPDw6ICpydW50aW1lXG4gICAgcG9ydHM6XG4gICAgICAtIFwiJHtQUk9NRVRIRVVTX1BVU0hHQVRFV0FZX1BPUlR9OiR7UFJPTUVUSEVVU19QVVNIR0FURVdBWV9QT1JUfVwiXG4gICAgZGVwbG95OlxuICAgICAgPDw6ICptb25pdG9yaW5nLWRlcGxveVxuYC5zbGljZSgxKVxuXG4vLyBHZW5lcmF0ZSBDaGFvc1xubGV0IGdlbmVyYXRlQ2hhb3MgPSAoKSA9PlxuXHRgXG4gIGNoYW9zOlxuICAgIGltYWdlOiBkb2NrZXJcbiAgICByZXN0YXJ0OiBvbi1mYWlsdXJlXG4gICAgY29udGFpbmVyX25hbWU6IHlkYi1jaGFvc1xuICAgIDw8OiAqcnVudGltZVxuICAgIGVudHJ5cG9pbnQ6IFtcIi9iaW4vc2hcIiwgXCItY1wiLCBcIi9vcHQveWRiL2NoYW9zLnNoXCJdXG4gICAgdm9sdW1lczpcbiAgICAgIC0gLi9jaGFvcy5zaDovb3B0L3lkYi9jaGFvcy5zaFxuICAgICAgLSAvdmFyL3J1bi9kb2NrZXIuc29jazovdmFyL3J1bi9kb2NrZXIuc29ja1xuYC5zbGljZSgxKVxuXG4vLyBHZW5lcmF0ZSBDb21wb3NlXG5leHBvcnQgbGV0IGdlbmVyYXRlQ29tcG9zZUZpbGUgPSAoeWRiRGF0YWJhc2VOb2RlQ291bnQ6IG51bWJlcikgPT4gYCMgQ29kZSBnZW5lcmF0ZWQgYnkgR2l0aHViIEFjdGlvbjsgRE8gTk9UIEVESVQuXG5cbngtcnVudGltZTogJnJ1bnRpbWVcbiAgcGxhdGZvcm06IGxpbnV4L2FtZDY0XG4gIHByaXZpbGVnZWQ6IHRydWVcbiAgbmV0d29ya19tb2RlOiBob3N0XG5cbngteWRiLW5vZGU6ICZ5ZGItbm9kZVxuICBpbWFnZTogY3IueWFuZGV4L2NycHRxb251b2RmNTFrZGo3YTdkL3lkYjoyNC40LjQuMTJcbiAgcmVzdGFydDogYWx3YXlzXG4gIGhvc3RuYW1lOiAke0hPU1R9XG4gIDw8OiAqcnVudGltZVxuICB2b2x1bWVzOlxuICAgIC0gLi95ZGIueWFtbDovb3B0L3lkYi9jZmcvY29uZmlnLnlhbWxcblxubmFtZTogeWRiXG5cbnNlcnZpY2VzOlxuJHtnZW5lcmF0ZVN0YXRpY05vZGUoKX1cbiR7QXJyYXkuZnJvbSh7IGxlbmd0aDogeWRiRGF0YWJhc2VOb2RlQ291bnQgfSwgKF8sIGkpID0+IGkgKyAxKVxuXHQubWFwKGdlbmVyYXRlRGF0YWJhc2VOb2RlKVxuXHQuam9pbignXFxuJyl9XG4ke2dlbmVyYXRlTW9uaXRvcmluZygpfVxuJHtnZW5lcmF0ZUNoYW9zKCl9XG5gXG5pZiAoaW1wb3J0Lm1ldGEudXJsID09PSBuZXcgVVJMKCcuL2NvbmZpZ3MudHMnLCBpbXBvcnQubWV0YS51cmwpLmhyZWYpIHtcblx0Y29uc29sZS5sb2coZ2VuZXJhdGVDb21wb3NlRmlsZSg1KSlcbn1cbiIsCiAgICAiaW1wb3J0IHsgZ2V0SW5wdXQgfSBmcm9tICdAYWN0aW9ucy9jb3JlJ1xuaW1wb3J0IHsgY29udGV4dCwgZ2V0T2N0b2tpdCB9IGZyb20gJ0BhY3Rpb25zL2dpdGh1YidcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFB1bGxSZXF1ZXN0TnVtYmVyKCkge1xuXHRsZXQgdG9rZW4gPSBnZXRJbnB1dCgnZ2l0aHViX3Rva2VuJykgfHwgcHJvY2Vzcy5lbnYuR0lUSFVCX1RPS0VOXG5cblx0bGV0IHByTnVtYmVyID0gZ2V0SW5wdXQoJ2dpdGh1Yl9wdWxsX3JlcXVlc3RfbnVtYmVyJylcblx0aWYgKHByTnVtYmVyLmxlbmd0aCA+IDApIHtcblx0XHRyZXR1cm4gcGFyc2VJbnQocHJOdW1iZXIpXG5cdH1cblxuXHRpZiAoY29udGV4dC5ldmVudE5hbWUgPT09ICdwdWxsX3JlcXVlc3QnKSB7XG5cdFx0cmV0dXJuIGNvbnRleHQucGF5bG9hZC5wdWxsX3JlcXVlc3QhLm51bWJlclxuXHR9XG5cblx0aWYgKHRva2VuKSB7XG5cdFx0bGV0IG9jdG9raXQgPSBnZXRPY3Rva2l0KHRva2VuKVxuXHRcdGxldCBicmFuY2ggPSBjb250ZXh0LnJlZi5yZXBsYWNlKCdyZWZzL2hlYWRzLycsICcnKVxuXG5cdFx0Y29uc3QgeyBkYXRhOiBwdWxscyB9ID0gYXdhaXQgb2N0b2tpdC5yZXN0LnB1bGxzLmxpc3Qoe1xuXHRcdFx0c3RhdGU6ICdvcGVuJyxcblx0XHRcdG93bmVyOiBjb250ZXh0LnJlcG8ub3duZXIsXG5cdFx0XHRyZXBvOiBjb250ZXh0LnJlcG8ucmVwbyxcblx0XHRcdGhlYWQ6IGAke2NvbnRleHQuYWN0b3J9OiR7YnJhbmNofWAsXG5cdFx0fSlcblxuXHRcdGlmIChwdWxscy5sZW5ndGggPiAwKSB7XG5cdFx0XHRyZXR1cm4gcHVsbHNbMF0ubnVtYmVyXG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIG51bGxcbn1cbiIKICBdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUdBLHNEQUNBLDJDQUNBO0FBTEE7QUFDQTs7Ozs7Ozs7Ozs7O0FDV0EsSUFBSSxxQkFBcUIsTUFDeEI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBUVU7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
