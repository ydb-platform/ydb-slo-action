import {
  getPullRequestNumber
} from "../main-6swh0r7e.js";
import {
  __toESM,
  require_core,
  require_exec
} from "../main-gvzvxekz.js";

// init/main.ts
var import_core = __toESM(require_core(), 1), import_exec = __toESM(require_exec(), 1);
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
process.env.GITHUB_ACTION_PATH ??= fileURLToPath(new URL("../..", import.meta.url));
async function main() {
  let cwd = path.join(process.cwd(), ".slo"), workload = import_core.getInput("workload_name") || "unspecified";
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
  await import_exec.exec("docker", ["compose", "-f", "compose.yml", "up", "--quiet-pull", "-d"], {
    cwd: path.resolve(process.env.GITHUB_ACTION_PATH, "deploy")
  });
  let start = /* @__PURE__ */ new Date;
  import_core.info(`YDB started at ${start}`), import_core.saveState("start", start.toISOString());
}
main();

//# debugId=28C331664AB5624664756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vaW5pdC9tYWluLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWwogICAgImltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ25vZGU6cGF0aCdcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICdub2RlOnVybCdcblxuaW1wb3J0IHsgZGVidWcsIGdldElucHV0LCBpbmZvLCBzYXZlU3RhdGUsIHNldEZhaWxlZCB9IGZyb20gJ0BhY3Rpb25zL2NvcmUnXG5pbXBvcnQgeyBleGVjIH0gZnJvbSAnQGFjdGlvbnMvZXhlYydcblxuaW1wb3J0IHsgZ2V0UHVsbFJlcXVlc3ROdW1iZXIgfSBmcm9tICcuL2xpYi9naXRodWIuanMnXG5cbnByb2Nlc3MuZW52WydHSVRIVUJfQUNUSU9OX1BBVEgnXSA/Pz0gZmlsZVVSTFRvUGF0aChuZXcgVVJMKCcuLi8uLicsIGltcG9ydC5tZXRhLnVybCkpXG5cbmFzeW5jIGZ1bmN0aW9uIG1haW4oKSB7XG5cdGxldCBjd2QgPSBwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgJy5zbG8nKVxuXHRsZXQgd29ya2xvYWQgPSBnZXRJbnB1dCgnd29ya2xvYWRfbmFtZScpIHx8ICd1bnNwZWNpZmllZCdcblxuXHRzYXZlU3RhdGUoJ2N3ZCcsIGN3ZClcblx0c2F2ZVN0YXRlKCdwdWxsJywgYXdhaXQgZ2V0UHVsbFJlcXVlc3ROdW1iZXIoKSlcblx0c2F2ZVN0YXRlKCdjb21taXQnLCBwcm9jZXNzLmVudlsnR0lUSFVCX1NIQSddKVxuXHRzYXZlU3RhdGUoJ3dvcmtsb2FkJywgd29ya2xvYWQpXG5cblx0ZnMubWtkaXJTeW5jKGN3ZCwgeyByZWN1cnNpdmU6IHRydWUgfSlcblxuXHR7XG5cdFx0bGV0IGRlcGxveVBhdGggPSBwYXRoLmpvaW4ocHJvY2Vzcy5lbnZbJ0dJVEhVQl9BQ1RJT05fUEFUSCddISwgJ2RlcGxveScpXG5cblx0XHRpZiAoIWZzLmV4aXN0c1N5bmMoZGVwbG95UGF0aCkpIHtcblx0XHRcdHNldEZhaWxlZChgRGVwbG95IGFzc2V0cyBub3QgZm91bmQgYXQgJHtkZXBsb3lQYXRofWApXG5cdFx0XHRyZXR1cm5cblx0XHR9XG5cblx0XHRmb3IgKGxldCBlbnRyeSBvZiBmcy5yZWFkZGlyU3luYyhkZXBsb3lQYXRoKSkge1xuXHRcdFx0bGV0IHNyYyA9IHBhdGguam9pbihkZXBsb3lQYXRoLCBlbnRyeSlcblx0XHRcdGxldCBkZXN0ID0gcGF0aC5qb2luKGN3ZCwgZW50cnkpXG5cdFx0XHRmcy5jcFN5bmMoc3JjLCBkZXN0LCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KVxuXHRcdH1cblxuXHRcdGRlYnVnKGBEZXBsb3kgYXNzZXRzIGNvcGllZCB0byAke2N3ZH1gKVxuXHR9XG5cblx0YXdhaXQgZXhlYyhgZG9ja2VyYCwgW2Bjb21wb3NlYCwgYC1mYCwgYGNvbXBvc2UueW1sYCwgYHVwYCwgYC0tcXVpZXQtcHVsbGAsIGAtZGBdLCB7XG5cdFx0Y3dkOiBwYXRoLnJlc29sdmUocHJvY2Vzcy5lbnZbJ0dJVEhVQl9BQ1RJT05fUEFUSCddLCAnZGVwbG95JyksXG5cdH0pXG5cblx0bGV0IHN0YXJ0ID0gbmV3IERhdGUoKVxuXHRpbmZvKGBZREIgc3RhcnRlZCBhdCAke3N0YXJ0fWApXG5cdHNhdmVTdGF0ZSgnc3RhcnQnLCBzdGFydC50b0lTT1N0cmluZygpKVxufVxuXG5tYWluKClcbiIKICBdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7QUFJQSw4Q0FDQTtBQUxBO0FBQ0E7QUFDQTtBQU9BLFFBQVEsSUFBSSx1QkFBMEIsY0FBYyxJQUFJLElBQUksU0FBUyxZQUFZLEdBQUcsQ0FBQztBQUVyRixlQUFlLElBQUksR0FBRztBQUFBLEVBQ3JCLElBQUksTUFBVyxVQUFLLFFBQVEsSUFBSSxHQUFHLE1BQU0sR0FDckMsV0FBVyxxQkFBUyxlQUFlLEtBQUs7QUFBQSxFQUU1QyxzQkFBVSxPQUFPLEdBQUcsR0FDcEIsc0JBQVUsUUFBUSxNQUFNLHFCQUFxQixDQUFDLEdBQzlDLHNCQUFVLFVBQVUsUUFBUSxJQUFJLFVBQWEsR0FDN0Msc0JBQVUsWUFBWSxRQUFRLEdBRTNCLGFBQVUsS0FBSyxFQUFFLFdBQVcsR0FBSyxDQUFDO0FBQUEsRUFFckM7QUFBQSxJQUNDLElBQUksYUFBa0IsVUFBSyxRQUFRLElBQUksb0JBQXdCLFFBQVE7QUFBQSxJQUV2RSxJQUFJLENBQUksY0FBVyxVQUFVLEdBQUc7QUFBQSxNQUMvQixzQkFBVSw4QkFBOEIsWUFBWTtBQUFBLE1BQ3BEO0FBQUE7QUFBQSxJQUdELFNBQVMsU0FBWSxlQUFZLFVBQVUsR0FBRztBQUFBLE1BQzdDLElBQUksTUFBVyxVQUFLLFlBQVksS0FBSyxHQUNqQyxPQUFZLFVBQUssS0FBSyxLQUFLO0FBQUEsTUFDNUIsVUFBTyxLQUFLLE1BQU0sRUFBRSxXQUFXLEdBQUssQ0FBQztBQUFBO0FBQUEsSUFHekMsa0JBQU0sMkJBQTJCLEtBQUs7QUFBQSxFQUN2QztBQUFBLEVBRUEsTUFBTSxpQkFBSyxVQUFVLENBQUMsV0FBVyxNQUFNLGVBQWUsTUFBTSxnQkFBZ0IsSUFBSSxHQUFHO0FBQUEsSUFDbEYsS0FBVSxhQUFRLFFBQVEsSUFBSSxvQkFBdUIsUUFBUTtBQUFBLEVBQzlELENBQUM7QUFBQSxFQUVELElBQUksd0JBQVEsSUFBSTtBQUFBLEVBQ2hCLGlCQUFLLGtCQUFrQixPQUFPLEdBQzlCLHNCQUFVLFNBQVMsTUFBTSxZQUFZLENBQUM7QUFBQTtBQUd2QyxLQUFLOyIsCiAgImRlYnVnSWQiOiAiMjhDMzMxNjY0QUI1NjI0NjY0NzU2RTIxNjQ3NTZFMjEiLAogICJuYW1lcyI6IFtdCn0=
