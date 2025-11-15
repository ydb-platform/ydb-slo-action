import {
  require_artifact
} from "../main-5frzate7.js";
import {
  __toESM,
  require_core,
  require_exec
} from "../main-t8kwkc9h.js";

// init/post.ts
var import_artifact = __toESM(require_artifact(), 1), import_core = __toESM(require_core(), 1), import_exec = __toESM(require_exec(), 1);
import * as fs from "node:fs";
import * as path from "node:path";
async function post() {
  let cwd = import_core.getState("cwd"), workload = import_core.getState("workload"), start = new Date(import_core.getState("start")), duration = (/* @__PURE__ */ new Date()).getTime() - start.getTime(), artifactClient = new import_artifact.DefaultArtifactClient, composeLogsPath = path.join(cwd, `${workload}-compose.log`), metricsFilePath = import_core.getState("telemetry_metrics_file") || path.join(cwd, "metrics.jsonl"), pullInfoPath = import_core.getState("pull_info_path");
  {
    let chunks = [];
    try {
      await import_exec.exec("docker", ["compose", "-f", "compose.yml", "logs", "--no-color"], {
        cwd,
        silent: !0,
        listeners: {
          stdout: (data) => chunks.push(data.toString()),
          stderr: (data) => chunks.push(data.toString())
        }
      }), fs.writeFileSync(composeLogsPath, chunks.join(""), { encoding: "utf-8" }), import_core.debug(`docker compose logs saved to ${composeLogsPath}`);
    } catch (error) {
      import_core.warning(`Failed to collect docker compose logs: ${String(error)}`), composeLogsPath = "";
    }
  }
  if (await import_exec.exec("docker", ["compose", "-f", "compose.yml", "down"], { cwd }), !metricsFilePath || !fs.existsSync(metricsFilePath))
    import_core.warning(`Metrics file not found at ${metricsFilePath}`), metricsFilePath = "";
  {
    let artifacts = [
      pullInfoPath ? { name: `${workload}-pull.txt`, path: pullInfoPath } : null,
      composeLogsPath ? { name: `${workload}-compose.log`, path: composeLogsPath } : null,
      metricsFilePath ? { name: `${workload}-metrics.jsonl`, path: metricsFilePath } : null
    ].filter(Boolean);
    for (let artifact of artifacts) {
      if (!fs.existsSync(artifact.path)) {
        import_core.warning(`Artifact source missing: ${artifact.path}`);
        continue;
      }
      let { id } = await artifactClient.uploadArtifact(artifact.name, [artifact.path], cwd, {
        retentionDays: 1
      });
      import_core.info(`Uploaded artifact ${artifact.name} (id: ${id})`);
    }
  }
  {
    fs.rmSync(cwd, { recursive: !0 }), import_core.debug(`Removed .slo workspace: ${cwd}`);
    let seconds = (duration / 1000).toFixed(1);
    import_core.info(`YDB SLO Test duration: ${seconds}s`);
  }
}
post();

//# debugId=6B6880D82474240D64756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vaW5pdC9wb3N0LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWwogICAgImltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ25vZGU6cGF0aCdcblxuaW1wb3J0IHsgRGVmYXVsdEFydGlmYWN0Q2xpZW50IH0gZnJvbSAnQGFjdGlvbnMvYXJ0aWZhY3QnXG5pbXBvcnQgeyBkZWJ1ZywgZ2V0U3RhdGUsIGluZm8sIHdhcm5pbmcgfSBmcm9tICdAYWN0aW9ucy9jb3JlJ1xuaW1wb3J0IHsgZXhlYyB9IGZyb20gJ0BhY3Rpb25zL2V4ZWMnXG5cbmFzeW5jIGZ1bmN0aW9uIHBvc3QoKSB7XG5cdGxldCBjd2QgPSBnZXRTdGF0ZSgnY3dkJylcblx0bGV0IHdvcmtsb2FkID0gZ2V0U3RhdGUoJ3dvcmtsb2FkJylcblxuXHRsZXQgc3RhcnQgPSBuZXcgRGF0ZShnZXRTdGF0ZSgnc3RhcnQnKSlcblx0bGV0IGZpbmlzaCA9IG5ldyBEYXRlKClcblx0bGV0IGR1cmF0aW9uID0gZmluaXNoLmdldFRpbWUoKSAtIHN0YXJ0LmdldFRpbWUoKVxuXG5cdGNvbnN0IGFydGlmYWN0Q2xpZW50ID0gbmV3IERlZmF1bHRBcnRpZmFjdENsaWVudCgpXG5cdGxldCBjb21wb3NlTG9nc1BhdGggPSBwYXRoLmpvaW4oY3dkLCBgJHt3b3JrbG9hZH0tY29tcG9zZS5sb2dgKVxuXHRsZXQgbWV0cmljc0ZpbGVQYXRoID0gZ2V0U3RhdGUoJ3RlbGVtZXRyeV9tZXRyaWNzX2ZpbGUnKSB8fCBwYXRoLmpvaW4oY3dkLCAnbWV0cmljcy5qc29ubCcpXG5cdGxldCBwdWxsSW5mb1BhdGggPSBnZXRTdGF0ZSgncHVsbF9pbmZvX3BhdGgnKVxuXG5cdC8qKlxuXHQgKiBDb2xsZWN0IGRvY2tlciBjb21wb3NlIGxvZ3Ncblx0ICovXG5cdHtcblx0XHRjb25zdCBjaHVua3M6IHN0cmluZ1tdID0gW11cblxuXHRcdHRyeSB7XG5cdFx0XHRhd2FpdCBleGVjKGBkb2NrZXJgLCBbYGNvbXBvc2VgLCBgLWZgLCBgY29tcG9zZS55bWxgLCBgbG9nc2AsIGAtLW5vLWNvbG9yYF0sIHtcblx0XHRcdFx0Y3dkLFxuXHRcdFx0XHRzaWxlbnQ6IHRydWUsXG5cdFx0XHRcdGxpc3RlbmVyczoge1xuXHRcdFx0XHRcdHN0ZG91dDogKGRhdGEpID0+IGNodW5rcy5wdXNoKGRhdGEudG9TdHJpbmcoKSksXG5cdFx0XHRcdFx0c3RkZXJyOiAoZGF0YSkgPT4gY2h1bmtzLnB1c2goZGF0YS50b1N0cmluZygpKSxcblx0XHRcdFx0fSxcblx0XHRcdH0pXG5cblx0XHRcdGZzLndyaXRlRmlsZVN5bmMoY29tcG9zZUxvZ3NQYXRoLCBjaHVua3Muam9pbignJyksIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSlcblx0XHRcdGRlYnVnKGBkb2NrZXIgY29tcG9zZSBsb2dzIHNhdmVkIHRvICR7Y29tcG9zZUxvZ3NQYXRofWApXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRcdHdhcm5pbmcoYEZhaWxlZCB0byBjb2xsZWN0IGRvY2tlciBjb21wb3NlIGxvZ3M6ICR7U3RyaW5nKGVycm9yKX1gKVxuXHRcdFx0Y29tcG9zZUxvZ3NQYXRoID0gJydcblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICogU3RvcCBkb2NrZXIgY29tcG9zZVxuXHQgKi9cblx0e1xuXHRcdGF3YWl0IGV4ZWMoYGRvY2tlcmAsIFtgY29tcG9zZWAsIGAtZmAsIGBjb21wb3NlLnltbGAsIGBkb3duYF0sIHsgY3dkIH0pXG5cdH1cblxuXHQvKipcblx0ICogUGVyc2lzdCB0ZWxlbWV0cnkgbWV0cmljc1xuXHQgKi9cblx0e1xuXHRcdGlmICghbWV0cmljc0ZpbGVQYXRoIHx8ICFmcy5leGlzdHNTeW5jKG1ldHJpY3NGaWxlUGF0aCkpIHtcblx0XHRcdHdhcm5pbmcoYE1ldHJpY3MgZmlsZSBub3QgZm91bmQgYXQgJHttZXRyaWNzRmlsZVBhdGh9YClcblx0XHRcdG1ldHJpY3NGaWxlUGF0aCA9ICcnXG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqIFVwbG9hZCBhcnRpZmFjdHNcblx0ICovXG5cdHtcblx0XHRjb25zdCBhcnRpZmFjdHMgPSBbXG5cdFx0XHRwdWxsSW5mb1BhdGggPyB7IG5hbWU6IGAke3dvcmtsb2FkfS1wdWxsLnR4dGAsIHBhdGg6IHB1bGxJbmZvUGF0aCB9IDogbnVsbCxcblx0XHRcdGNvbXBvc2VMb2dzUGF0aCA/IHsgbmFtZTogYCR7d29ya2xvYWR9LWNvbXBvc2UubG9nYCwgcGF0aDogY29tcG9zZUxvZ3NQYXRoIH0gOiBudWxsLFxuXHRcdFx0bWV0cmljc0ZpbGVQYXRoID8geyBuYW1lOiBgJHt3b3JrbG9hZH0tbWV0cmljcy5qc29ubGAsIHBhdGg6IG1ldHJpY3NGaWxlUGF0aCB9IDogbnVsbCxcblx0XHRdLmZpbHRlcihCb29sZWFuKSBhcyB7IG5hbWU6IHN0cmluZzsgcGF0aDogc3RyaW5nIH1bXVxuXG5cdFx0Zm9yIChjb25zdCBhcnRpZmFjdCBvZiBhcnRpZmFjdHMpIHtcblx0XHRcdGlmICghZnMuZXhpc3RzU3luYyhhcnRpZmFjdC5wYXRoKSkge1xuXHRcdFx0XHR3YXJuaW5nKGBBcnRpZmFjdCBzb3VyY2UgbWlzc2luZzogJHthcnRpZmFjdC5wYXRofWApXG5cdFx0XHRcdGNvbnRpbnVlXG5cdFx0XHR9XG5cblx0XHRcdGxldCB7IGlkIH0gPSBhd2FpdCBhcnRpZmFjdENsaWVudC51cGxvYWRBcnRpZmFjdChhcnRpZmFjdC5uYW1lLCBbYXJ0aWZhY3QucGF0aF0sIGN3ZCwge1xuXHRcdFx0XHRyZXRlbnRpb25EYXlzOiAxLFxuXHRcdFx0fSlcblxuXHRcdFx0aW5mbyhgVXBsb2FkZWQgYXJ0aWZhY3QgJHthcnRpZmFjdC5uYW1lfSAoaWQ6ICR7aWR9KWApXG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqIENsZWFudXBcblx0ICovXG5cdHtcblx0XHRmcy5ybVN5bmMoY3dkLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KVxuXHRcdGRlYnVnKGBSZW1vdmVkIC5zbG8gd29ya3NwYWNlOiAke2N3ZH1gKVxuXG5cdFx0bGV0IHNlY29uZHMgPSAoZHVyYXRpb24gLyAxMDAwKS50b0ZpeGVkKDEpXG5cdFx0aW5mbyhgWURCIFNMTyBUZXN0IGR1cmF0aW9uOiAke3NlY29uZHN9c2ApXG5cdH1cbn1cblxucG9zdCgpXG4iCiAgXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7O0FBR0Esc0RBQ0EsMENBQ0E7QUFMQTtBQUNBO0FBTUEsZUFBZSxJQUFJLEdBQUc7QUFBQSxFQUNyQixJQUFJLE1BQU0scUJBQVMsS0FBSyxHQUNwQixXQUFXLHFCQUFTLFVBQVUsR0FFOUIsUUFBUSxJQUFJLEtBQUsscUJBQVMsT0FBTyxDQUFDLEdBRWxDLDRCQURTLElBQUksS0FBSyxHQUNBLFFBQVEsSUFBSSxNQUFNLFFBQVEsR0FFMUMsaUJBQWlCLElBQUksdUNBQ3ZCLGtCQUF1QixVQUFLLEtBQUssR0FBRyxzQkFBc0IsR0FDMUQsa0JBQWtCLHFCQUFTLHdCQUF3QixLQUFVLFVBQUssS0FBSyxlQUFlLEdBQ3RGLGVBQWUscUJBQVMsZ0JBQWdCO0FBQUEsRUFLNUM7QUFBQSxJQUNDLElBQU0sU0FBbUIsQ0FBQztBQUFBLElBRTFCLElBQUk7QUFBQSxNQUNILE1BQU0saUJBQUssVUFBVSxDQUFDLFdBQVcsTUFBTSxlQUFlLFFBQVEsWUFBWSxHQUFHO0FBQUEsUUFDNUU7QUFBQSxRQUNBLFFBQVE7QUFBQSxRQUNSLFdBQVc7QUFBQSxVQUNWLFFBQVEsQ0FBQyxTQUFTLE9BQU8sS0FBSyxLQUFLLFNBQVMsQ0FBQztBQUFBLFVBQzdDLFFBQVEsQ0FBQyxTQUFTLE9BQU8sS0FBSyxLQUFLLFNBQVMsQ0FBQztBQUFBLFFBQzlDO0FBQUEsTUFDRCxDQUFDLEdBRUUsaUJBQWMsaUJBQWlCLE9BQU8sS0FBSyxFQUFFLEdBQUcsRUFBRSxVQUFVLFFBQVEsQ0FBQyxHQUN4RSxrQkFBTSxnQ0FBZ0MsaUJBQWlCO0FBQUEsTUFDdEQsT0FBTyxPQUFPO0FBQUEsTUFDZixvQkFBUSwwQ0FBMEMsT0FBTyxLQUFLLEdBQUcsR0FDakUsa0JBQWtCO0FBQUE7QUFBQSxFQUVwQjtBQUFBLEVBYUMsSUFQQSxNQUFNLGlCQUFLLFVBQVUsQ0FBQyxXQUFXLE1BQU0sZUFBZSxNQUFNLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FPbEUsQ0FBQyxtQkFBbUIsQ0FBSSxjQUFXLGVBQWU7QUFBQSxJQUNyRCxvQkFBUSw2QkFBNkIsaUJBQWlCLEdBQ3RELGtCQUFrQjtBQUFBLEVBT3BCO0FBQUEsSUFDQyxJQUFNLFlBQVk7QUFBQSxNQUNqQixlQUFlLEVBQUUsTUFBTSxHQUFHLHFCQUFxQixNQUFNLGFBQWEsSUFBSTtBQUFBLE1BQ3RFLGtCQUFrQixFQUFFLE1BQU0sR0FBRyx3QkFBd0IsTUFBTSxnQkFBZ0IsSUFBSTtBQUFBLE1BQy9FLGtCQUFrQixFQUFFLE1BQU0sR0FBRywwQkFBMEIsTUFBTSxnQkFBZ0IsSUFBSTtBQUFBLElBQ2xGLEVBQUUsT0FBTyxPQUFPO0FBQUEsSUFFaEIsU0FBVyxZQUFZLFdBQVc7QUFBQSxNQUNqQyxJQUFJLENBQUksY0FBVyxTQUFTLElBQUksR0FBRztBQUFBLFFBQ2xDLG9CQUFRLDRCQUE0QixTQUFTLE1BQU07QUFBQSxRQUNuRDtBQUFBO0FBQUEsTUFHRCxNQUFNLE9BQU8sTUFBTSxlQUFlLGVBQWUsU0FBUyxNQUFNLENBQUMsU0FBUyxJQUFJLEdBQUcsS0FBSztBQUFBLFFBQ3JGLGVBQWU7QUFBQSxNQUNoQixDQUFDO0FBQUEsTUFFRCxpQkFBSyxxQkFBcUIsU0FBUyxhQUFhLEtBQUs7QUFBQTtBQUFBLEVBRXZEO0FBQUEsRUFLQTtBQUFBLElBQ0ksVUFBTyxLQUFLLEVBQUUsV0FBVyxHQUFLLENBQUMsR0FDbEMsa0JBQU0sMkJBQTJCLEtBQUs7QUFBQSxJQUV0QyxJQUFJLFdBQVcsV0FBVyxNQUFNLFFBQVEsQ0FBQztBQUFBLElBQ3pDLGlCQUFLLDBCQUEwQixVQUFVO0FBQUEsRUFDMUM7QUFBQTtBQUdELEtBQUs7IiwKICAiZGVidWdJZCI6ICI2QjY4ODBEODI0NzQyNDBENjQ3NTZFMjE2NDc1NkUyMSIsCiAgIm5hbWVzIjogW10KfQ==
