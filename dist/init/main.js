import {
  getComposeProfiles,
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
  }
  let start = /* @__PURE__ */ new Date;
  import_core.info(`YDB started at ${start}`), import_core.saveState("start", start.toISOString());
}
main();

//# debugId=CA88BEB7F03A81E864756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vaW5pdC9tYWluLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWwogICAgImltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ25vZGU6cGF0aCdcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICdub2RlOnVybCdcblxuaW1wb3J0IHsgZGVidWcsIGdldElucHV0LCBpbmZvLCBzYXZlU3RhdGUsIHNldEZhaWxlZCB9IGZyb20gJ0BhY3Rpb25zL2NvcmUnXG5pbXBvcnQgeyBleGVjIH0gZnJvbSAnQGFjdGlvbnMvZXhlYydcblxuaW1wb3J0IHsgZ2V0Q29tcG9zZVByb2ZpbGVzIH0gZnJvbSAnLi9saWIvZG9ja2VyLmpzJ1xuaW1wb3J0IHsgZ2V0UHVsbFJlcXVlc3ROdW1iZXIgfSBmcm9tICcuL2xpYi9naXRodWIuanMnXG5cbnByb2Nlc3MuZW52WydHSVRIVUJfQUNUSU9OX1BBVEgnXSA/Pz0gZmlsZVVSTFRvUGF0aChuZXcgVVJMKCcuLi8uLicsIGltcG9ydC5tZXRhLnVybCkpXG5hc3luYyBmdW5jdGlvbiBtYWluKCkge1xuXHRsZXQgY3dkID0gcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksICcuc2xvJylcblx0bGV0IHdvcmtsb2FkID0gZ2V0SW5wdXQoJ3dvcmtsb2FkX25hbWUnKSB8fCAndW5zcGVjaWZpZWQnXG5cdGxldCBkaXNhYmxlUHJvZmlsZXMgPSBnZXRJbnB1dCgnZGlzYWJsZV9jb21wb3NlX3Byb2ZpbGVzJykgfHwgJydcblxuXHRzYXZlU3RhdGUoJ2N3ZCcsIGN3ZClcblx0c2F2ZVN0YXRlKCdwdWxsJywgYXdhaXQgZ2V0UHVsbFJlcXVlc3ROdW1iZXIoKSlcblx0c2F2ZVN0YXRlKCdjb21taXQnLCBwcm9jZXNzLmVudlsnR0lUSFVCX1NIQSddKVxuXHRzYXZlU3RhdGUoJ3dvcmtsb2FkJywgd29ya2xvYWQpXG5cblx0ZnMubWtkaXJTeW5jKGN3ZCwgeyByZWN1cnNpdmU6IHRydWUgfSlcblxuXHR7XG5cdFx0bGV0IGRlcGxveVBhdGggPSBwYXRoLmpvaW4ocHJvY2Vzcy5lbnZbJ0dJVEhVQl9BQ1RJT05fUEFUSCddISwgJ2RlcGxveScpXG5cblx0XHRpZiAoIWZzLmV4aXN0c1N5bmMoZGVwbG95UGF0aCkpIHtcblx0XHRcdHNldEZhaWxlZChgRGVwbG95IGFzc2V0cyBub3QgZm91bmQgYXQgJHtkZXBsb3lQYXRofWApXG5cdFx0XHRyZXR1cm5cblx0XHR9XG5cblx0XHRmb3IgKGxldCBlbnRyeSBvZiBmcy5yZWFkZGlyU3luYyhkZXBsb3lQYXRoKSkge1xuXHRcdFx0bGV0IHNyYyA9IHBhdGguam9pbihkZXBsb3lQYXRoLCBlbnRyeSlcblx0XHRcdGxldCBkZXN0ID0gcGF0aC5qb2luKGN3ZCwgZW50cnkpXG5cdFx0XHRmcy5jcFN5bmMoc3JjLCBkZXN0LCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KVxuXHRcdH1cblxuXHRcdGRlYnVnKGBEZXBsb3kgYXNzZXRzIGNvcGllZCB0byAke2N3ZH1gKVxuXHR9XG5cblx0e1xuXHRcdGxldCBwcm9maWxlcyA9IGF3YWl0IGdldENvbXBvc2VQcm9maWxlcyhjd2QpXG5cdFx0cHJvZmlsZXMgPSBwcm9maWxlcy5maWx0ZXIoKHByb2ZpbGU6IHN0cmluZykgPT4gIWRpc2FibGVQcm9maWxlcy5pbmNsdWRlcyhwcm9maWxlKSlcblxuXHRcdGF3YWl0IGV4ZWMoYGRvY2tlcmAsIFtgY29tcG9zZWAsIGB1cGAsIGAtLXF1aWV0LXB1bGxgLCBgLS1xdWlldC1idWlsZGAsIGAtLWRldGFjaGBdLCB7XG5cdFx0XHRjd2QsXG5cdFx0XHRlbnY6IHtcblx0XHRcdFx0Li4ucHJvY2Vzcy5lbnYsXG5cdFx0XHRcdENPTVBPU0VfUFJPRklMRVM6IHByb2ZpbGVzLmpvaW4oJywnKSxcblx0XHRcdH0sXG5cdFx0fSlcblxuXHRcdGRlYnVnKGBSYW4gd2l0aCBwcm9maWxlczogJHtwcm9maWxlcy5qb2luKCcsICcpfWApXG5cdH1cblxuXHRsZXQgc3RhcnQgPSBuZXcgRGF0ZSgpXG5cdGluZm8oYFlEQiBzdGFydGVkIGF0ICR7c3RhcnR9YClcblx0c2F2ZVN0YXRlKCdzdGFydCcsIHN0YXJ0LnRvSVNPU3RyaW5nKCkpXG59XG5cbm1haW4oKVxuIgogIF0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7QUFJQSw4Q0FDQTtBQUxBO0FBQ0E7QUFDQTtBQVFBLFFBQVEsSUFBSSx1QkFBMEIsY0FBYyxJQUFJLElBQUksU0FBUyxZQUFZLEdBQUcsQ0FBQztBQUNyRixlQUFlLElBQUksR0FBRztBQUFBLEVBQ3JCLElBQUksTUFBVyxVQUFLLFFBQVEsSUFBSSxHQUFHLE1BQU0sR0FDckMsV0FBVyxxQkFBUyxlQUFlLEtBQUssZUFDeEMsa0JBQWtCLHFCQUFTLDBCQUEwQixLQUFLO0FBQUEsRUFFOUQsc0JBQVUsT0FBTyxHQUFHLEdBQ3BCLHNCQUFVLFFBQVEsTUFBTSxxQkFBcUIsQ0FBQyxHQUM5QyxzQkFBVSxVQUFVLFFBQVEsSUFBSSxVQUFhLEdBQzdDLHNCQUFVLFlBQVksUUFBUSxHQUUzQixhQUFVLEtBQUssRUFBRSxXQUFXLEdBQUssQ0FBQztBQUFBLEVBRXJDO0FBQUEsSUFDQyxJQUFJLGFBQWtCLFVBQUssUUFBUSxJQUFJLG9CQUF3QixRQUFRO0FBQUEsSUFFdkUsSUFBSSxDQUFJLGNBQVcsVUFBVSxHQUFHO0FBQUEsTUFDL0Isc0JBQVUsOEJBQThCLFlBQVk7QUFBQSxNQUNwRDtBQUFBO0FBQUEsSUFHRCxTQUFTLFNBQVksZUFBWSxVQUFVLEdBQUc7QUFBQSxNQUM3QyxJQUFJLE1BQVcsVUFBSyxZQUFZLEtBQUssR0FDakMsT0FBWSxVQUFLLEtBQUssS0FBSztBQUFBLE1BQzVCLFVBQU8sS0FBSyxNQUFNLEVBQUUsV0FBVyxHQUFLLENBQUM7QUFBQTtBQUFBLElBR3pDLGtCQUFNLDJCQUEyQixLQUFLO0FBQUEsRUFDdkM7QUFBQSxFQUVBO0FBQUEsSUFDQyxJQUFJLFdBQVcsTUFBTSxtQkFBbUIsR0FBRztBQUFBLElBQzNDLFdBQVcsU0FBUyxPQUFPLENBQUMsWUFBb0IsQ0FBQyxnQkFBZ0IsU0FBUyxPQUFPLENBQUMsR0FFbEYsTUFBTSxpQkFBSyxVQUFVLENBQUMsV0FBVyxNQUFNLGdCQUFnQixpQkFBaUIsVUFBVSxHQUFHO0FBQUEsTUFDcEY7QUFBQSxNQUNBLEtBQUs7QUFBQSxXQUNELFFBQVE7QUFBQSxRQUNYLGtCQUFrQixTQUFTLEtBQUssR0FBRztBQUFBLE1BQ3BDO0FBQUEsSUFDRCxDQUFDLEdBRUQsa0JBQU0sc0JBQXNCLFNBQVMsS0FBSyxJQUFJLEdBQUc7QUFBQSxFQUNsRDtBQUFBLEVBRUEsSUFBSSx3QkFBUSxJQUFJO0FBQUEsRUFDaEIsaUJBQUssa0JBQWtCLE9BQU8sR0FDOUIsc0JBQVUsU0FBUyxNQUFNLFlBQVksQ0FBQztBQUFBO0FBR3ZDLEtBQUs7IiwKICAiZGVidWdJZCI6ICJDQTg4QkVCN0YwM0E4MUU4NjQ3NTZFMjE2NDc1NkUyMSIsCiAgIm5hbWVzIjogW10KfQ==
