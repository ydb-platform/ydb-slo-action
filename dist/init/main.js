import {
  getPullRequestNumber
} from "./lib/github.js";
import"../main-ab3q65z6.js";
import"../main-yansfnd3.js";
import {
  require_core
} from "../main-d4h7eace.js";
import {
  require_exec
} from "../main-c7r720rd.js";
import {
  __toESM
} from "../main-ynsbc1hx.js";

// init/main.ts
var import_core = __toESM(require_core(), 1), import_exec = __toESM(require_exec(), 1);
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
async function main() {
  let cwd = path.join(process.cwd(), ".slo"), workload = import_core.getInput("workload_name") || "unspecified";
  import_core.saveState("cwd", cwd), import_core.saveState("workload", workload), fs.mkdirSync(cwd, { recursive: !0 });
  let prNumber = await getPullRequestNumber();
  if (!prNumber) {
    import_core.setFailed("Pull request number not found");
    return;
  }
  import_core.saveState("pull", prNumber);
  {
    let pullPath = path.join(cwd, `${workload}-pull.txt`);
    import_core.saveState("pull_info_path", pullPath), fs.writeFileSync(pullPath, prNumber.toFixed(0), { encoding: "utf-8" }), import_core.debug(`Pull request information saved to ${pullPath}`);
  }
  {
    let actionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../"), deployPath = path.join(actionRoot, "deploy");
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
  await import_exec.exec("docker", ["compose", "-f", "compose.yml", "up", "--quiet-pull", "-d"], { cwd });
  let start = /* @__PURE__ */ new Date;
  import_core.info(`YDB started at ${start}`), import_core.saveState("start", start.toISOString());
}
main();

//# debugId=CE0E55500ECB271A64756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vaW5pdC9tYWluLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWwogICAgImltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ25vZGU6cGF0aCdcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICdub2RlOnVybCdcblxuaW1wb3J0IHsgZGVidWcsIGdldElucHV0LCBpbmZvLCBzYXZlU3RhdGUsIHNldEZhaWxlZCB9IGZyb20gJ0BhY3Rpb25zL2NvcmUnXG5pbXBvcnQgeyBleGVjIH0gZnJvbSAnQGFjdGlvbnMvZXhlYydcblxuaW1wb3J0IHsgZ2V0UHVsbFJlcXVlc3ROdW1iZXIgfSBmcm9tICcuL2xpYi9naXRodWIuanMnXG5cbmFzeW5jIGZ1bmN0aW9uIG1haW4oKSB7XG5cdGxldCBjd2QgPSBwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgJy5zbG8nKVxuXHRsZXQgd29ya2xvYWQgPSBnZXRJbnB1dCgnd29ya2xvYWRfbmFtZScpIHx8ICd1bnNwZWNpZmllZCdcblxuXHRzYXZlU3RhdGUoJ2N3ZCcsIGN3ZClcblx0c2F2ZVN0YXRlKCd3b3JrbG9hZCcsIHdvcmtsb2FkKVxuXG5cdGZzLm1rZGlyU3luYyhjd2QsIHsgcmVjdXJzaXZlOiB0cnVlIH0pXG5cblx0bGV0IHByTnVtYmVyID0gYXdhaXQgZ2V0UHVsbFJlcXVlc3ROdW1iZXIoKVxuXHRpZiAoIXByTnVtYmVyKSB7XG5cdFx0c2V0RmFpbGVkKCdQdWxsIHJlcXVlc3QgbnVtYmVyIG5vdCBmb3VuZCcpXG5cdFx0cmV0dXJuXG5cdH1cblxuXHRzYXZlU3RhdGUoJ3B1bGwnLCBwck51bWJlcilcblxuXHR7XG5cdFx0bGV0IHB1bGxQYXRoID0gcGF0aC5qb2luKGN3ZCwgYCR7d29ya2xvYWR9LXB1bGwudHh0YClcblx0XHRzYXZlU3RhdGUoJ3B1bGxfaW5mb19wYXRoJywgcHVsbFBhdGgpXG5cdFx0ZnMud3JpdGVGaWxlU3luYyhwdWxsUGF0aCwgcHJOdW1iZXIudG9GaXhlZCgwKSwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KVxuXG5cdFx0ZGVidWcoYFB1bGwgcmVxdWVzdCBpbmZvcm1hdGlvbiBzYXZlZCB0byAke3B1bGxQYXRofWApXG5cdH1cblxuXHR7XG5cdFx0bGV0IGFjdGlvblJvb3QgPSBwYXRoLnJlc29sdmUocGF0aC5kaXJuYW1lKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSksICcuLi8uLi8nKVxuXHRcdGxldCBkZXBsb3lQYXRoID0gcGF0aC5qb2luKGFjdGlvblJvb3QsICdkZXBsb3knKVxuXG5cdFx0aWYgKCFmcy5leGlzdHNTeW5jKGRlcGxveVBhdGgpKSB7XG5cdFx0XHRzZXRGYWlsZWQoYERlcGxveSBhc3NldHMgbm90IGZvdW5kIGF0ICR7ZGVwbG95UGF0aH1gKVxuXHRcdFx0cmV0dXJuXG5cdFx0fVxuXG5cdFx0Zm9yIChsZXQgZW50cnkgb2YgZnMucmVhZGRpclN5bmMoZGVwbG95UGF0aCkpIHtcblx0XHRcdGxldCBzcmMgPSBwYXRoLmpvaW4oZGVwbG95UGF0aCwgZW50cnkpXG5cdFx0XHRsZXQgZGVzdCA9IHBhdGguam9pbihjd2QsIGVudHJ5KVxuXHRcdFx0ZnMuY3BTeW5jKHNyYywgZGVzdCwgeyByZWN1cnNpdmU6IHRydWUgfSlcblx0XHR9XG5cblx0XHRkZWJ1ZyhgRGVwbG95IGFzc2V0cyBjb3BpZWQgdG8gJHtjd2R9YClcblx0fVxuXG5cdHtcblx0XHRhd2FpdCBleGVjKGBkb2NrZXJgLCBbYGNvbXBvc2VgLCBgLWZgLCBgY29tcG9zZS55bWxgLCBgdXBgLCBgLS1xdWlldC1wdWxsYCwgYC1kYF0sIHsgY3dkIH0pXG5cdH1cblxuXHRsZXQgc3RhcnQgPSBuZXcgRGF0ZSgpXG5cdGluZm8oYFlEQiBzdGFydGVkIGF0ICR7c3RhcnR9YClcblx0c2F2ZVN0YXRlKCdzdGFydCcsIHN0YXJ0LnRvSVNPU3RyaW5nKCkpXG59XG5cbm1haW4oKVxuIgogIF0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7OztBQUlBLDhDQUNBO0FBTEE7QUFDQTtBQUNBO0FBT0EsZUFBZSxJQUFJLEdBQUc7QUFBQSxFQUNyQixJQUFJLE1BQVcsVUFBSyxRQUFRLElBQUksR0FBRyxNQUFNLEdBQ3JDLFdBQVcscUJBQVMsZUFBZSxLQUFLO0FBQUEsRUFFNUMsc0JBQVUsT0FBTyxHQUFHLEdBQ3BCLHNCQUFVLFlBQVksUUFBUSxHQUUzQixhQUFVLEtBQUssRUFBRSxXQUFXLEdBQUssQ0FBQztBQUFBLEVBRXJDLElBQUksV0FBVyxNQUFNLHFCQUFxQjtBQUFBLEVBQzFDLElBQUksQ0FBQyxVQUFVO0FBQUEsSUFDZCxzQkFBVSwrQkFBK0I7QUFBQSxJQUN6QztBQUFBO0FBQUEsRUFHRCxzQkFBVSxRQUFRLFFBQVE7QUFBQSxFQUUxQjtBQUFBLElBQ0MsSUFBSSxXQUFnQixVQUFLLEtBQUssR0FBRyxtQkFBbUI7QUFBQSxJQUNwRCxzQkFBVSxrQkFBa0IsUUFBUSxHQUNqQyxpQkFBYyxVQUFVLFNBQVMsUUFBUSxDQUFDLEdBQUcsRUFBRSxVQUFVLFFBQVEsQ0FBQyxHQUVyRSxrQkFBTSxxQ0FBcUMsVUFBVTtBQUFBLEVBQ3REO0FBQUEsRUFFQTtBQUFBLElBQ0MsSUFBSSxhQUFrQixhQUFhLGFBQVEsY0FBYyxZQUFZLEdBQUcsQ0FBQyxHQUFHLFFBQVEsR0FDaEYsYUFBa0IsVUFBSyxZQUFZLFFBQVE7QUFBQSxJQUUvQyxJQUFJLENBQUksY0FBVyxVQUFVLEdBQUc7QUFBQSxNQUMvQixzQkFBVSw4QkFBOEIsWUFBWTtBQUFBLE1BQ3BEO0FBQUE7QUFBQSxJQUdELFNBQVMsU0FBWSxlQUFZLFVBQVUsR0FBRztBQUFBLE1BQzdDLElBQUksTUFBVyxVQUFLLFlBQVksS0FBSyxHQUNqQyxPQUFZLFVBQUssS0FBSyxLQUFLO0FBQUEsTUFDNUIsVUFBTyxLQUFLLE1BQU0sRUFBRSxXQUFXLEdBQUssQ0FBQztBQUFBO0FBQUEsSUFHekMsa0JBQU0sMkJBQTJCLEtBQUs7QUFBQSxFQUN2QztBQUFBLEVBR0MsTUFBTSxpQkFBSyxVQUFVLENBQUMsV0FBVyxNQUFNLGVBQWUsTUFBTSxnQkFBZ0IsSUFBSSxHQUFHLEVBQUUsSUFBSSxDQUFDO0FBQUEsRUFHM0YsSUFBSSx3QkFBUSxJQUFJO0FBQUEsRUFDaEIsaUJBQUssa0JBQWtCLE9BQU8sR0FDOUIsc0JBQVUsU0FBUyxNQUFNLFlBQVksQ0FBQztBQUFBO0FBR3ZDLEtBQUs7IiwKICAiZGVidWdJZCI6ICJDRTBFNTU1MDBFQ0IyNzFBNjQ3NTZFMjE2NDc1NkUyMSIsCiAgIm5hbWVzIjogW10KfQ==
