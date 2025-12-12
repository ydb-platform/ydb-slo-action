import {
  getComposeProfiles,
  getContainerIp,
  getPullRequestNumber
} from "../main-rtq75qvy.js";
import {
  __toESM,
  require_core,
  require_exec
} from "../main-tjp1a9xb.js";

// init/main.ts
var import_core = __toESM(require_core(), 1), import_exec = __toESM(require_exec(), 1);
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
process.env.GITHUB_ACTION_PATH ??= fileURLToPath(new URL("../..", import.meta.url));
async function main() {
  let cwd = path.join(process.cwd(), ".slo"), workload = import_core.getInput("workload_name") || "unspecified", disableProfiles = import_core.getInput("disable_compose_profiles") || "";
  import_core.saveState("cwd", cwd), import_core.saveState("pull", await getPullRequestNumber()), import_core.saveState("commit", process.env.GITHUB_SHA), import_core.saveState("workload", workload), fs.mkdirSync(cwd, { recursive: !0 });
  {
    let deployPath = path.join(process.env.GITHUB_ACTION_PATH, "deploy");
    if (!fs.existsSync(deployPath)) {
      import_core.setFailed(`Deploy assets not found at ${deployPath}`);
      return;
    }
    for (let entry of fs.readdirSync(deployPath)) {
      let src = path.join(deployPath, entry), dest = path.join(cwd, entry);
      fs.cpSync(src, dest, { recursive: !0 });
    }
    import_core.debug(`Deploy assets copied to ${cwd}`);
  }
  {
    let profiles = await getComposeProfiles(cwd);
    profiles = profiles.filter((profile) => !disableProfiles.includes(profile)), await import_exec.exec("docker", ["compose", "up", "--quiet-pull", "--quiet-build", "--detach"], {
      cwd,
      env: {
        ...process.env,
        COMPOSE_PROFILES: profiles.join(",")
      }
    }), import_core.debug(`Ran with profiles: ${profiles.join(", ")}`);
    let ydbStorageIps = [
      await getContainerIp("ydb-storage-1")
    ], ydbDatabaseIps = [
      await getContainerIp("ydb-database-1"),
      await getContainerIp("ydb-database-2"),
      await getContainerIp("ydb-database-3"),
      await getContainerIp("ydb-database-4"),
      await getContainerIp("ydb-database-5")
    ];
    if (profiles.includes("chaos"))
      ydbDatabaseIps.push(await getContainerIp("ydb-blackhole"));
    if (import_core.setOutput("ydb-storage-ips", ydbStorageIps.filter(Boolean).join(",")), import_core.setOutput("ydb-database-ips", ydbDatabaseIps.filter(Boolean).join(",")), profiles.includes("telemetry")) {
      let prometheusIp = await getContainerIp("ydb-prometheus");
      import_core.setOutput("ydb-prometheus-url", `http://${prometheusIp}:9090`);
    }
  }
  let start = /* @__PURE__ */ new Date;
  import_core.info(`YDB started at ${start}`), import_core.saveState("start", start.toISOString());
}
main();

//# debugId=9CD87740BDCF39E364756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vaW5pdC9tYWluLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWwogICAgImltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ25vZGU6cGF0aCdcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICdub2RlOnVybCdcblxuaW1wb3J0IHsgZGVidWcsIGdldElucHV0LCBpbmZvLCBzYXZlU3RhdGUsIHNldEZhaWxlZCwgc2V0T3V0cHV0IH0gZnJvbSAnQGFjdGlvbnMvY29yZSdcbmltcG9ydCB7IGV4ZWMgfSBmcm9tICdAYWN0aW9ucy9leGVjJ1xuXG5pbXBvcnQgeyBnZXRDb21wb3NlUHJvZmlsZXMsIGdldENvbnRhaW5lcklwIH0gZnJvbSAnLi9saWIvZG9ja2VyLmpzJ1xuaW1wb3J0IHsgZ2V0UHVsbFJlcXVlc3ROdW1iZXIgfSBmcm9tICcuL2xpYi9naXRodWIuanMnXG5cbnByb2Nlc3MuZW52WydHSVRIVUJfQUNUSU9OX1BBVEgnXSA/Pz0gZmlsZVVSTFRvUGF0aChuZXcgVVJMKCcuLi8uLicsIGltcG9ydC5tZXRhLnVybCkpXG5hc3luYyBmdW5jdGlvbiBtYWluKCkge1xuXHRsZXQgY3dkID0gcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksICcuc2xvJylcblx0bGV0IHdvcmtsb2FkID0gZ2V0SW5wdXQoJ3dvcmtsb2FkX25hbWUnKSB8fCAndW5zcGVjaWZpZWQnXG5cdGxldCBkaXNhYmxlUHJvZmlsZXMgPSBnZXRJbnB1dCgnZGlzYWJsZV9jb21wb3NlX3Byb2ZpbGVzJykgfHwgJydcblxuXHRzYXZlU3RhdGUoJ2N3ZCcsIGN3ZClcblx0c2F2ZVN0YXRlKCdwdWxsJywgYXdhaXQgZ2V0UHVsbFJlcXVlc3ROdW1iZXIoKSlcblx0c2F2ZVN0YXRlKCdjb21taXQnLCBwcm9jZXNzLmVudlsnR0lUSFVCX1NIQSddKVxuXHRzYXZlU3RhdGUoJ3dvcmtsb2FkJywgd29ya2xvYWQpXG5cblx0ZnMubWtkaXJTeW5jKGN3ZCwgeyByZWN1cnNpdmU6IHRydWUgfSlcblxuXHR7XG5cdFx0bGV0IGRlcGxveVBhdGggPSBwYXRoLmpvaW4ocHJvY2Vzcy5lbnZbJ0dJVEhVQl9BQ1RJT05fUEFUSCddISwgJ2RlcGxveScpXG5cblx0XHRpZiAoIWZzLmV4aXN0c1N5bmMoZGVwbG95UGF0aCkpIHtcblx0XHRcdHNldEZhaWxlZChgRGVwbG95IGFzc2V0cyBub3QgZm91bmQgYXQgJHtkZXBsb3lQYXRofWApXG5cdFx0XHRyZXR1cm5cblx0XHR9XG5cblx0XHRmb3IgKGxldCBlbnRyeSBvZiBmcy5yZWFkZGlyU3luYyhkZXBsb3lQYXRoKSkge1xuXHRcdFx0bGV0IHNyYyA9IHBhdGguam9pbihkZXBsb3lQYXRoLCBlbnRyeSlcblx0XHRcdGxldCBkZXN0ID0gcGF0aC5qb2luKGN3ZCwgZW50cnkpXG5cdFx0XHRmcy5jcFN5bmMoc3JjLCBkZXN0LCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KVxuXHRcdH1cblxuXHRcdGRlYnVnKGBEZXBsb3kgYXNzZXRzIGNvcGllZCB0byAke2N3ZH1gKVxuXHR9XG5cblx0e1xuXHRcdGxldCBwcm9maWxlcyA9IGF3YWl0IGdldENvbXBvc2VQcm9maWxlcyhjd2QpXG5cdFx0cHJvZmlsZXMgPSBwcm9maWxlcy5maWx0ZXIoKHByb2ZpbGU6IHN0cmluZykgPT4gIWRpc2FibGVQcm9maWxlcy5pbmNsdWRlcyhwcm9maWxlKSlcblxuXHRcdGF3YWl0IGV4ZWMoYGRvY2tlcmAsIFtgY29tcG9zZWAsIGB1cGAsIGAtLXF1aWV0LXB1bGxgLCBgLS1xdWlldC1idWlsZGAsIGAtLWRldGFjaGBdLCB7XG5cdFx0XHRjd2QsXG5cdFx0XHRlbnY6IHtcblx0XHRcdFx0Li4ucHJvY2Vzcy5lbnYsXG5cdFx0XHRcdENPTVBPU0VfUFJPRklMRVM6IHByb2ZpbGVzLmpvaW4oJywnKSxcblx0XHRcdH0sXG5cdFx0fSlcblxuXHRcdGRlYnVnKGBSYW4gd2l0aCBwcm9maWxlczogJHtwcm9maWxlcy5qb2luKCcsICcpfWApXG5cblx0XHQvLyBwcmV0dGllci1pZ25vcmVcblx0XHRsZXQgeWRiU3RvcmFnZUlwcyA9IFtcblx0XHRcdGF3YWl0IGdldENvbnRhaW5lcklwKCd5ZGItc3RvcmFnZS0xJylcblx0XHRdXG5cblx0XHRsZXQgeWRiRGF0YWJhc2VJcHMgPSBbXG5cdFx0XHRhd2FpdCBnZXRDb250YWluZXJJcCgneWRiLWRhdGFiYXNlLTEnKSxcblx0XHRcdGF3YWl0IGdldENvbnRhaW5lcklwKCd5ZGItZGF0YWJhc2UtMicpLFxuXHRcdFx0YXdhaXQgZ2V0Q29udGFpbmVySXAoJ3lkYi1kYXRhYmFzZS0zJyksXG5cdFx0XHRhd2FpdCBnZXRDb250YWluZXJJcCgneWRiLWRhdGFiYXNlLTQnKSxcblx0XHRcdGF3YWl0IGdldENvbnRhaW5lcklwKCd5ZGItZGF0YWJhc2UtNScpLFxuXHRcdF1cblxuXHRcdGlmIChwcm9maWxlcy5pbmNsdWRlcygnY2hhb3MnKSkge1xuXHRcdFx0eWRiRGF0YWJhc2VJcHMucHVzaChhd2FpdCBnZXRDb250YWluZXJJcCgneWRiLWJsYWNraG9sZScpKVxuXHRcdH1cblxuXHRcdHNldE91dHB1dCgneWRiLXN0b3JhZ2UtaXBzJywgeWRiU3RvcmFnZUlwcy5maWx0ZXIoQm9vbGVhbikuam9pbignLCcpKVxuXHRcdHNldE91dHB1dCgneWRiLWRhdGFiYXNlLWlwcycsIHlkYkRhdGFiYXNlSXBzLmZpbHRlcihCb29sZWFuKS5qb2luKCcsJykpXG5cblx0XHRpZiAocHJvZmlsZXMuaW5jbHVkZXMoJ3RlbGVtZXRyeScpKSB7XG5cdFx0XHRsZXQgcHJvbWV0aGV1c0lwID0gYXdhaXQgZ2V0Q29udGFpbmVySXAoJ3lkYi1wcm9tZXRoZXVzJylcblx0XHRcdHNldE91dHB1dCgneWRiLXByb21ldGhldXMtdXJsJywgYGh0dHA6Ly8ke3Byb21ldGhldXNJcH06OTA5MGApXG5cdFx0fVxuXHR9XG5cblx0bGV0IHN0YXJ0ID0gbmV3IERhdGUoKVxuXHRpbmZvKGBZREIgc3RhcnRlZCBhdCAke3N0YXJ0fWApXG5cdHNhdmVTdGF0ZSgnc3RhcnQnLCBzdGFydC50b0lTT1N0cmluZygpKVxufVxuXG5tYWluKClcbiIKICBdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7OztBQUlBLDhDQUNBO0FBTEE7QUFDQTtBQUNBO0FBUUEsUUFBUSxJQUFJLHVCQUEwQixjQUFjLElBQUksSUFBSSxTQUFTLFlBQVksR0FBRyxDQUFDO0FBQ3JGLGVBQWUsSUFBSSxHQUFHO0FBQUEsRUFDckIsSUFBSSxNQUFXLFVBQUssUUFBUSxJQUFJLEdBQUcsTUFBTSxHQUNyQyxXQUFXLHFCQUFTLGVBQWUsS0FBSyxlQUN4QyxrQkFBa0IscUJBQVMsMEJBQTBCLEtBQUs7QUFBQSxFQUU5RCxzQkFBVSxPQUFPLEdBQUcsR0FDcEIsc0JBQVUsUUFBUSxNQUFNLHFCQUFxQixDQUFDLEdBQzlDLHNCQUFVLFVBQVUsUUFBUSxJQUFJLFVBQWEsR0FDN0Msc0JBQVUsWUFBWSxRQUFRLEdBRTNCLGFBQVUsS0FBSyxFQUFFLFdBQVcsR0FBSyxDQUFDO0FBQUEsRUFFckM7QUFBQSxJQUNDLElBQUksYUFBa0IsVUFBSyxRQUFRLElBQUksb0JBQXdCLFFBQVE7QUFBQSxJQUV2RSxJQUFJLENBQUksY0FBVyxVQUFVLEdBQUc7QUFBQSxNQUMvQixzQkFBVSw4QkFBOEIsWUFBWTtBQUFBLE1BQ3BEO0FBQUE7QUFBQSxJQUdELFNBQVMsU0FBWSxlQUFZLFVBQVUsR0FBRztBQUFBLE1BQzdDLElBQUksTUFBVyxVQUFLLFlBQVksS0FBSyxHQUNqQyxPQUFZLFVBQUssS0FBSyxLQUFLO0FBQUEsTUFDNUIsVUFBTyxLQUFLLE1BQU0sRUFBRSxXQUFXLEdBQUssQ0FBQztBQUFBO0FBQUEsSUFHekMsa0JBQU0sMkJBQTJCLEtBQUs7QUFBQSxFQUN2QztBQUFBLEVBRUE7QUFBQSxJQUNDLElBQUksV0FBVyxNQUFNLG1CQUFtQixHQUFHO0FBQUEsSUFDM0MsV0FBVyxTQUFTLE9BQU8sQ0FBQyxZQUFvQixDQUFDLGdCQUFnQixTQUFTLE9BQU8sQ0FBQyxHQUVsRixNQUFNLGlCQUFLLFVBQVUsQ0FBQyxXQUFXLE1BQU0sZ0JBQWdCLGlCQUFpQixVQUFVLEdBQUc7QUFBQSxNQUNwRjtBQUFBLE1BQ0EsS0FBSztBQUFBLFdBQ0QsUUFBUTtBQUFBLFFBQ1gsa0JBQWtCLFNBQVMsS0FBSyxHQUFHO0FBQUEsTUFDcEM7QUFBQSxJQUNELENBQUMsR0FFRCxrQkFBTSxzQkFBc0IsU0FBUyxLQUFLLElBQUksR0FBRztBQUFBLElBR2pELElBQUksZ0JBQWdCO0FBQUEsTUFDbkIsTUFBTSxlQUFlLGVBQWU7QUFBQSxJQUNyQyxHQUVJLGlCQUFpQjtBQUFBLE1BQ3BCLE1BQU0sZUFBZSxnQkFBZ0I7QUFBQSxNQUNyQyxNQUFNLGVBQWUsZ0JBQWdCO0FBQUEsTUFDckMsTUFBTSxlQUFlLGdCQUFnQjtBQUFBLE1BQ3JDLE1BQU0sZUFBZSxnQkFBZ0I7QUFBQSxNQUNyQyxNQUFNLGVBQWUsZ0JBQWdCO0FBQUEsSUFDdEM7QUFBQSxJQUVBLElBQUksU0FBUyxTQUFTLE9BQU87QUFBQSxNQUM1QixlQUFlLEtBQUssTUFBTSxlQUFlLGVBQWUsQ0FBQztBQUFBLElBTTFELElBSEEsc0JBQVUsbUJBQW1CLGNBQWMsT0FBTyxPQUFPLEVBQUUsS0FBSyxHQUFHLENBQUMsR0FDcEUsc0JBQVUsb0JBQW9CLGVBQWUsT0FBTyxPQUFPLEVBQUUsS0FBSyxHQUFHLENBQUMsR0FFbEUsU0FBUyxTQUFTLFdBQVcsR0FBRztBQUFBLE1BQ25DLElBQUksZUFBZSxNQUFNLGVBQWUsZ0JBQWdCO0FBQUEsTUFDeEQsc0JBQVUsc0JBQXNCLFVBQVUsbUJBQW1CO0FBQUE7QUFBQSxFQUUvRDtBQUFBLEVBRUEsSUFBSSx3QkFBUSxJQUFJO0FBQUEsRUFDaEIsaUJBQUssa0JBQWtCLE9BQU8sR0FDOUIsc0JBQVUsU0FBUyxNQUFNLFlBQVksQ0FBQztBQUFBO0FBR3ZDLEtBQUs7IiwKICAiZGVidWdJZCI6ICI5Q0Q4Nzc0MEJEQ0YzOUUzNjQ3NTZFMjE2NDc1NkUyMSIsCiAgIm5hbWVzIjogW10KfQ==
