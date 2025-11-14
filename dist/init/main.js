import {
  require_github
} from "../main-5sw3hmtr.js";
import {
  require_artifact,
  require_core,
  require_exec
} from "../main-7765bw5h.js";
import {
  otel_collector_default
} from "./cfg/otel-collector.js";
import {
  ydb_config_default
} from "./cfg/ydb-config.js";
import {
  generateComposeFile
} from "./configs.js";
import {
  HOST,
  PROMETHEUS_PUSHGATEWAY_PORT
} from "./constants.js";
import {
  __toESM
} from "../main-ynsbc1hx.js";

// init/main.ts
var import_artifact = __toESM(require_artifact(), 1), import_core2 = __toESM(require_core(), 1), import_exec = __toESM(require_exec(), 1);
import * as fs from "node:fs";
import * as path from "node:path";

// init/chaos.sh
var chaos_default = `#!/bin/sh -e

get_random_container() {
    # Get a list of all containers starting with ydb-database-*
    containers=$(docker ps --format '{{.Names}}' | grep '^ydb-database-')

    # Convert the list to a newline-separated string
    containers=$(echo "$containers" | tr ' ' '\\n')

    # Count the number of containers
    containersCount=$(echo "$containers" | wc -l)

    # Generate a random number between 0 and containersCount - 1
    randomIndex=$(shuf -i 0-$(($containersCount - 1)) -n 1)

    # Get the container name at the random index
    nodeForChaos=$(echo "$containers" | sed -n "$(($randomIndex + 1))p")
}

sleep 60

get_random_container
sh -c "docker stop \${nodeForChaos} -t 30"
sh -c "docker start \${nodeForChaos}"

sleep 60

get_random_container
sh -c "docker restart \${nodeForChaos} -t 0"

sleep 60

get_random_container
sh -c "docker kill -s SIGKILL \${nodeForChaos}"

sleep 60
`;

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
    let configPath = path.join(cwd, "ydb.yaml"), configContent = ydb_config_default.replaceAll("${{ host }}", HOST);
    fs.writeFileSync(configPath, configContent, { encoding: "utf-8" }), import_core2.info(`Created config for ydb: ${configPath}`);
  }
  {
    import_core2.info("Creating prometheus config...");
    let configPath = path.join(cwd, "prometheus.yml"), configContent = otel_collector_default.replace("${{ pushgateway }}", `${HOST}:${PROMETHEUS_PUSHGATEWAY_PORT}`);
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

//# debugId=918BEC73FE5E11D064756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vaW5pdC9tYWluLnRzIiwgIi4uL2luaXQvcHVsbHMudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbCiAgICAiaW1wb3J0ICogYXMgZnMgZnJvbSAnbm9kZTpmcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJ1xuXG5pbXBvcnQgeyBEZWZhdWx0QXJ0aWZhY3RDbGllbnQgfSBmcm9tICdAYWN0aW9ucy9hcnRpZmFjdCdcbmltcG9ydCB7IGRlYnVnLCBnZXRJbnB1dCwgaW5mbywgc2F2ZVN0YXRlIH0gZnJvbSAnQGFjdGlvbnMvY29yZSdcbmltcG9ydCB7IGV4ZWMgfSBmcm9tICdAYWN0aW9ucy9leGVjJ1xuXG5pbXBvcnQgcHJvbWV0aGV1c0NvbmZpZyBmcm9tICcuL2NmZy9vdGVsLWNvbGxlY3Rvci55bWwnIHdpdGggeyB0eXBlOiAndGV4dCcgfVxuaW1wb3J0IHlkYkNvbmZpZyBmcm9tICcuL2NmZy95ZGItY29uZmlnLnltbCcgd2l0aCB7IHR5cGU6ICd0ZXh0JyB9XG5pbXBvcnQgY2hhb3MgZnJvbSAnLi9jaGFvcy5zaCcgd2l0aCB7IHR5cGU6ICd0ZXh0JyB9XG5cbmltcG9ydCB7IGdlbmVyYXRlQ29tcG9zZUZpbGUgfSBmcm9tICcuL2NvbmZpZ3MuanMnXG5pbXBvcnQgeyBIT1NULCBQUk9NRVRIRVVTX1BVU0hHQVRFV0FZX1BPUlQgfSBmcm9tICcuL2NvbnN0YW50cy5qcydcbmltcG9ydCB7IGdldFB1bGxSZXF1ZXN0TnVtYmVyIH0gZnJvbSAnLi9wdWxscy5qcydcblxuYXN5bmMgZnVuY3Rpb24gbWFpbigpIHtcblx0bGV0IGN3ZCA9IHBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCAnLnNsbycpXG5cdGxldCB3b3JrbG9hZCA9IGdldElucHV0KCd3b3JrbG9hZF9uYW1lJykgfHwgZ2V0SW5wdXQoJ3Nka19uYW1lJykgfHwgJ3Vuc3BlY2lmaWVkJ1xuXG5cdHNhdmVTdGF0ZSgnY3dkJywgY3dkKVxuXHRzYXZlU3RhdGUoJ3dvcmtsb2FkJywgd29ya2xvYWQpXG5cblx0ZGVidWcoJ0NyZWF0aW5nIHdvcmtpbmcgZGlyZWN0b3J5Li4uJylcblx0ZnMubWtkaXJTeW5jKGN3ZCwgeyByZWN1cnNpdmU6IHRydWUgfSlcblxuXHRQUjoge1xuXHRcdGluZm8oJ0FxdWlyZSBwdWxsIHJlcXVlc3QgbnVtYmVyLi4uJylcblx0XHRsZXQgcHJOdW1iZXIgPSAoYXdhaXQgZ2V0UHVsbFJlcXVlc3ROdW1iZXIoKSkgfHwgLTFcblx0XHRpbmZvKGBQdWxsIHJlcXVlc3QgbnVtYmVyOiAke3ByTnVtYmVyfWApXG5cblx0XHRpZiAocHJOdW1iZXIgPCAwKSB7XG5cdFx0XHRicmVhayBQUlxuXHRcdH1cblxuXHRcdHNhdmVTdGF0ZSgncHVsbCcsIHByTnVtYmVyKVxuXG5cdFx0aW5mbygnV3JpdGluZyBwdWxsIG51bWJlci4uLicpXG5cdFx0bGV0IHB1bGxQYXRoID0gcGF0aC5qb2luKGN3ZCwgYCR7d29ya2xvYWR9LXB1bGwudHh0YClcblx0XHRmcy53cml0ZUZpbGVTeW5jKHB1bGxQYXRoLCBwck51bWJlci50b0ZpeGVkKDApLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pXG5cdFx0aW5mbyhgUHVsbCBudW1iZXIgd3JpdHRlbiB0byAke3B1bGxQYXRofWApXG5cblx0XHRsZXQgYXJ0aWZhY3RDbGllbnQgPSBuZXcgRGVmYXVsdEFydGlmYWN0Q2xpZW50KClcblxuXHRcdGluZm8oJ1VwbG9hZCBwdWxsIG51bWJlciBhcyBhbiBhcnRpZmFjdC4uLicpXG5cdFx0bGV0IHsgaWQgfSA9IGF3YWl0IGFydGlmYWN0Q2xpZW50LnVwbG9hZEFydGlmYWN0KGAke3dvcmtsb2FkfS1wdWxsLnR4dGAsIFtwdWxsUGF0aF0sIGN3ZCwgeyByZXRlbnRpb25EYXlzOiAxIH0pXG5cdFx0aW5mbyhgUHVsbCBudW1iZXIgdXBsb2FkZWQgYXMgYW4gYXJ0aWZhY3QgJHtpZH1gKVxuXHR9XG5cblx0e1xuXHRcdGluZm8oJ0NyZWF0aW5nIHlkYiBjb25maWcuLi4nKVxuXHRcdGxldCBjb25maWdQYXRoID0gcGF0aC5qb2luKGN3ZCwgJ3lkYi55YW1sJylcblx0XHRsZXQgY29uZmlnQ29udGVudCA9IHlkYkNvbmZpZy5yZXBsYWNlQWxsKCcke3sgaG9zdCB9fScsIEhPU1QpXG5cblx0XHRmcy53cml0ZUZpbGVTeW5jKGNvbmZpZ1BhdGgsIGNvbmZpZ0NvbnRlbnQsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSlcblx0XHRpbmZvKGBDcmVhdGVkIGNvbmZpZyBmb3IgeWRiOiAke2NvbmZpZ1BhdGh9YClcblx0fVxuXG5cdHtcblx0XHRpbmZvKCdDcmVhdGluZyBwcm9tZXRoZXVzIGNvbmZpZy4uLicpXG5cdFx0bGV0IGNvbmZpZ1BhdGggPSBwYXRoLmpvaW4oY3dkLCAncHJvbWV0aGV1cy55bWwnKVxuXHRcdGxldCBjb25maWdDb250ZW50ID0gcHJvbWV0aGV1c0NvbmZpZy5yZXBsYWNlKCcke3sgcHVzaGdhdGV3YXkgfX0nLCBgJHtIT1NUfToke1BST01FVEhFVVNfUFVTSEdBVEVXQVlfUE9SVH1gKVxuXG5cdFx0ZnMud3JpdGVGaWxlU3luYyhjb25maWdQYXRoLCBjb25maWdDb250ZW50LCB7IGVuY29kaW5nOiAndXRmLTgnIH0pXG5cdFx0aW5mbyhgQ3JlYXRlZCBjb25maWcgZm9yIHByb21ldGhldXM6ICR7Y29uZmlnUGF0aH1gKVxuXHR9XG5cblx0e1xuXHRcdGluZm8oJ0NyZWF0aW5nIGNoYW9zIHNjcmlwdC4uLicpXG5cdFx0bGV0IHNjcmlwdFBhdGggPSBwYXRoLmpvaW4oY3dkLCAnY2hhb3Muc2gnKVxuXG5cdFx0ZnMud3JpdGVGaWxlU3luYyhzY3JpcHRQYXRoLCBjaGFvcywgeyBlbmNvZGluZzogJ3V0Zi04JywgbW9kZTogMG83NTUgfSlcblx0XHRpbmZvKGBDcmVhdGVkIGNoYW9zIHNjcmlwdDogJHtzY3JpcHRQYXRofWApXG5cdH1cblxuXHR7XG5cdFx0aW5mbygnQ3JlYXRpbmcgY29tcG9zZSBjb25maWcuLi4nKVxuXHRcdGxldCBjb21wb3NlUGF0aCA9IHBhdGguam9pbihjd2QsICdjb21wb3NlLnlhbWwnKVxuXHRcdGxldCBjb21wb3NlQ29udGVudCA9IGdlbmVyYXRlQ29tcG9zZUZpbGUocGFyc2VJbnQoZ2V0SW5wdXQoJ3lkYl9kYXRhYmFzZV9ub2RlX2NvdW50JywgeyByZXF1aXJlZDogdHJ1ZSB9KSkpXG5cblx0XHRmcy53cml0ZUZpbGVTeW5jKGNvbXBvc2VQYXRoLCBjb21wb3NlQ29udGVudCwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KVxuXHRcdGluZm8oYENyZWF0ZWQgY29tcG9zZS55YW1sOiAke2NvbXBvc2VQYXRofWApXG5cdH1cblxuXHRpbmZvKCdTdGFydGluZyBZREIuLi4nKVxuXHRhd2FpdCBleGVjKGBkb2NrZXJgLCBbYGNvbXBvc2VgLCBgLWZgLCBgY29tcG9zZS55YW1sYCwgYHVwYCwgYC0tcXVpZXQtcHVsbGAsIGAtZGBdLCB7IGN3ZCB9KVxuXG5cdGxldCBzdGFydCA9IG5ldyBEYXRlKClcblx0aW5mbyhgWURCIHN0YXJ0ZWQgYXQgJHtzdGFydH1gKVxuXHRzYXZlU3RhdGUoJ3N0YXJ0Jywgc3RhcnQudG9JU09TdHJpbmcoKSlcbn1cblxubWFpbigpXG4iLAogICAgImltcG9ydCB7IGdldElucHV0IH0gZnJvbSAnQGFjdGlvbnMvY29yZSdcbmltcG9ydCB7IGNvbnRleHQsIGdldE9jdG9raXQgfSBmcm9tICdAYWN0aW9ucy9naXRodWInXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRQdWxsUmVxdWVzdE51bWJlcigpIHtcblx0bGV0IHRva2VuID0gZ2V0SW5wdXQoJ2dpdGh1Yl90b2tlbicpIHx8IHByb2Nlc3MuZW52LkdJVEhVQl9UT0tFTlxuXG5cdGxldCBwck51bWJlciA9IGdldElucHV0KCdnaXRodWJfcHVsbF9yZXF1ZXN0X251bWJlcicpXG5cdGlmIChwck51bWJlci5sZW5ndGggPiAwKSB7XG5cdFx0cmV0dXJuIHBhcnNlSW50KHByTnVtYmVyKVxuXHR9XG5cblx0aWYgKGNvbnRleHQuZXZlbnROYW1lID09PSAncHVsbF9yZXF1ZXN0Jykge1xuXHRcdHJldHVybiBjb250ZXh0LnBheWxvYWQucHVsbF9yZXF1ZXN0IS5udW1iZXJcblx0fVxuXG5cdGlmICh0b2tlbikge1xuXHRcdGxldCBvY3Rva2l0ID0gZ2V0T2N0b2tpdCh0b2tlbilcblx0XHRsZXQgYnJhbmNoID0gY29udGV4dC5yZWYucmVwbGFjZSgncmVmcy9oZWFkcy8nLCAnJylcblxuXHRcdGNvbnN0IHsgZGF0YTogcHVsbHMgfSA9IGF3YWl0IG9jdG9raXQucmVzdC5wdWxscy5saXN0KHtcblx0XHRcdHN0YXRlOiAnb3BlbicsXG5cdFx0XHRvd25lcjogY29udGV4dC5yZXBvLm93bmVyLFxuXHRcdFx0cmVwbzogY29udGV4dC5yZXBvLnJlcG8sXG5cdFx0XHRoZWFkOiBgJHtjb250ZXh0LmFjdG9yfToke2JyYW5jaH1gLFxuXHRcdH0pXG5cblx0XHRpZiAocHVsbHMubGVuZ3RoID4gMCkge1xuXHRcdFx0cmV0dXJuIHB1bGxzWzBdLm51bWJlclxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBudWxsXG59XG4iCiAgXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUdBLHNEQUNBLDJDQUNBO0FBTEE7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDREEsOENBQ0E7QUFFQSxlQUFzQixvQkFBb0IsR0FBRztBQUFBLEVBQzVDLElBQUksUUFBUSxxQkFBUyxjQUFjLEtBQUssUUFBUSxJQUFJLGNBRWhELFdBQVcscUJBQVMsNEJBQTRCO0FBQUEsRUFDcEQsSUFBSSxTQUFTLFNBQVM7QUFBQSxJQUNyQixPQUFPLFNBQVMsUUFBUTtBQUFBLEVBR3pCLElBQUksc0JBQVEsY0FBYztBQUFBLElBQ3pCLE9BQU8sc0JBQVEsUUFBUSxhQUFjO0FBQUEsRUFHdEMsSUFBSSxPQUFPO0FBQUEsSUFDVixJQUFJLFVBQVUseUJBQVcsS0FBSyxHQUMxQixTQUFTLHNCQUFRLElBQUksUUFBUSxlQUFlLEVBQUUsS0FFMUMsTUFBTSxVQUFVLE1BQU0sUUFBUSxLQUFLLE1BQU0sS0FBSztBQUFBLE1BQ3JELE9BQU87QUFBQSxNQUNQLE9BQU8sc0JBQVEsS0FBSztBQUFBLE1BQ3BCLE1BQU0sc0JBQVEsS0FBSztBQUFBLE1BQ25CLE1BQU0sR0FBRyxzQkFBUSxTQUFTO0FBQUEsSUFDM0IsQ0FBQztBQUFBLElBRUQsSUFBSSxNQUFNLFNBQVM7QUFBQSxNQUNsQixPQUFPLE1BQU0sR0FBRztBQUFBO0FBQUEsRUFJbEIsT0FBTztBQUFBOzs7QURoQlIsZUFBZSxJQUFJLEdBQUc7QUFBQSxFQUNyQixJQUFJLE1BQVcsVUFBSyxRQUFRLElBQUksR0FBRyxNQUFNLEdBQ3JDLFdBQVcsc0JBQVMsZUFBZSxLQUFLLHNCQUFTLFVBQVUsS0FBSztBQUFBLEVBRXBFLHVCQUFVLE9BQU8sR0FBRyxHQUNwQix1QkFBVSxZQUFZLFFBQVEsR0FFOUIsbUJBQU0sK0JBQStCLEdBQ2xDLGFBQVUsS0FBSyxFQUFFLFdBQVcsR0FBSyxDQUFDO0FBQUEsRUFFckMsSUFBSTtBQUFBLElBQ0gsa0JBQUssK0JBQStCO0FBQUEsSUFDcEMsSUFBSSxXQUFZLE1BQU0scUJBQXFCLEtBQU07QUFBQSxJQUdqRCxJQUZBLGtCQUFLLHdCQUF3QixVQUFVLEdBRW5DLFdBQVc7QUFBQSxNQUNkO0FBQUEsSUFHRCx1QkFBVSxRQUFRLFFBQVEsR0FFMUIsa0JBQUssd0JBQXdCO0FBQUEsSUFDN0IsSUFBSSxXQUFnQixVQUFLLEtBQUssR0FBRyxtQkFBbUI7QUFBQSxJQUNqRCxpQkFBYyxVQUFVLFNBQVMsUUFBUSxDQUFDLEdBQUcsRUFBRSxVQUFVLFFBQVEsQ0FBQyxHQUNyRSxrQkFBSywwQkFBMEIsVUFBVTtBQUFBLElBRXpDLElBQUksaUJBQWlCLElBQUk7QUFBQSxJQUV6QixrQkFBSyxzQ0FBc0M7QUFBQSxJQUMzQyxNQUFNLE9BQU8sTUFBTSxlQUFlLGVBQWUsR0FBRyxxQkFBcUIsQ0FBQyxRQUFRLEdBQUcsS0FBSyxFQUFFLGVBQWUsRUFBRSxDQUFDO0FBQUEsSUFDOUcsa0JBQUssdUNBQXVDLElBQUk7QUFBQTtBQUFBLEVBR2pEO0FBQUEsSUFDQyxrQkFBSyx3QkFBd0I7QUFBQSxJQUM3QixJQUFJLGFBQWtCLFVBQUssS0FBSyxVQUFVLEdBQ3RDLGdCQUFnQixtQkFBVSxXQUFXLGVBQWUsSUFBSTtBQUFBLElBRXpELGlCQUFjLFlBQVksZUFBZSxFQUFFLFVBQVUsUUFBUSxDQUFDLEdBQ2pFLGtCQUFLLDJCQUEyQixZQUFZO0FBQUEsRUFDN0M7QUFBQSxFQUVBO0FBQUEsSUFDQyxrQkFBSywrQkFBK0I7QUFBQSxJQUNwQyxJQUFJLGFBQWtCLFVBQUssS0FBSyxnQkFBZ0IsR0FDNUMsZ0JBQWdCLHVCQUFpQixRQUFRLHNCQUFzQixHQUFHLFFBQVEsNkJBQTZCO0FBQUEsSUFFeEcsaUJBQWMsWUFBWSxlQUFlLEVBQUUsVUFBVSxRQUFRLENBQUMsR0FDakUsa0JBQUssa0NBQWtDLFlBQVk7QUFBQSxFQUNwRDtBQUFBLEVBRUE7QUFBQSxJQUNDLGtCQUFLLDBCQUEwQjtBQUFBLElBQy9CLElBQUksYUFBa0IsVUFBSyxLQUFLLFVBQVU7QUFBQSxJQUV2QyxpQkFBYyxZQUFZLGVBQU8sRUFBRSxVQUFVLFNBQVMsTUFBTSxJQUFNLENBQUMsR0FDdEUsa0JBQUsseUJBQXlCLFlBQVk7QUFBQSxFQUMzQztBQUFBLEVBRUE7QUFBQSxJQUNDLGtCQUFLLDRCQUE0QjtBQUFBLElBQ2pDLElBQUksY0FBbUIsVUFBSyxLQUFLLGNBQWMsR0FDM0MsaUJBQWlCLG9CQUFvQixTQUFTLHNCQUFTLDJCQUEyQixFQUFFLFVBQVUsR0FBSyxDQUFDLENBQUMsQ0FBQztBQUFBLElBRXZHLGlCQUFjLGFBQWEsZ0JBQWdCLEVBQUUsVUFBVSxRQUFRLENBQUMsR0FDbkUsa0JBQUsseUJBQXlCLGFBQWE7QUFBQSxFQUM1QztBQUFBLEVBRUEsa0JBQUssaUJBQWlCLEdBQ3RCLE1BQU0saUJBQUssVUFBVSxDQUFDLFdBQVcsTUFBTSxnQkFBZ0IsTUFBTSxnQkFBZ0IsSUFBSSxHQUFHLEVBQUUsSUFBSSxDQUFDO0FBQUEsRUFFM0YsSUFBSSx3QkFBUSxJQUFJO0FBQUEsRUFDaEIsa0JBQUssa0JBQWtCLE9BQU8sR0FDOUIsdUJBQVUsU0FBUyxNQUFNLFlBQVksQ0FBQztBQUFBO0FBR3ZDLEtBQUs7IiwKICAiZGVidWdJZCI6ICI5MThCRUM3M0ZFNUUxMUQwNjQ3NTZFMjE2NDc1NkUyMSIsCiAgIm5hbWVzIjogW10KfQ==
