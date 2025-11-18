import {
  require_core,
  require_exec
} from "../main-gq2p93nb.js";
import {
  require_github
} from "../github-jgav07sj.js";
import"../main-2h1wxd0e.js";
import"../main-zqznhazw.js";
import {
  __toESM
} from "../main-ynsbc1hx.js";

// init/main.ts
var import_core2 = __toESM(require_core(), 1), import_exec = __toESM(require_exec(), 1);
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// init/lib/github.ts
var import_core = __toESM(require_core(), 1), import_github = __toESM(require_github(), 1);
async function getPullRequestNumber() {
  let explicitPrNumber = import_core.getInput("github_pull_request_number");
  if (explicitPrNumber)
    return Number.parseInt(explicitPrNumber, 10);
  if (import_github.context.payload.pull_request)
    return import_github.context.payload.pull_request.number;
  let token = import_core.getInput("github_token");
  if (!token)
    return null;
  try {
    let { data } = await import_github.getOctokit(token).rest.repos.listPullRequestsAssociatedWithCommit({
      owner: import_github.context.repo.owner,
      repo: import_github.context.repo.repo,
      commit_sha: import_github.context.sha
    });
    if (data.length > 0)
      return data[0].number;
  } catch {
    return null;
  }
  return null;
}

// init/main.ts
async function main() {
  let cwd = path.join(process.cwd(), ".slo"), workload = import_core2.getInput("workload_name") || "unspecified";
  import_core2.saveState("cwd", cwd), import_core2.saveState("workload", workload), fs.mkdirSync(cwd, { recursive: !0 });
  let prNumber = await getPullRequestNumber();
  if (!prNumber) {
    import_core2.setFailed("Pull request number not found");
    return;
  }
  import_core2.saveState("pull", prNumber);
  {
    let pullPath = path.join(cwd, `${workload}-pull.txt`);
    import_core2.saveState("pull_info_path", pullPath), fs.writeFileSync(pullPath, prNumber.toFixed(0), { encoding: "utf-8" }), import_core2.debug(`Pull request information saved to ${pullPath}`);
  }
  {
    let actionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../"), deployPath = path.join(actionRoot, "deploy");
    if (!fs.existsSync(deployPath)) {
      import_core2.setFailed(`Deploy assets not found at ${deployPath}`);
      return;
    }
    for (let entry of fs.readdirSync(deployPath)) {
      let src = path.join(deployPath, entry), dest = path.join(cwd, entry);
      fs.cpSync(src, dest, { recursive: !0 });
    }
    import_core2.debug(`Deploy assets copied to ${cwd}`);
  }
  await import_exec.exec("docker", ["compose", "-f", "compose.yml", "up", "--quiet-pull", "-d"], { cwd });
  let start = /* @__PURE__ */ new Date;
  import_core2.info(`YDB started at ${start}`), import_core2.saveState("start", start.toISOString());
}
main();

//# debugId=FA665EBB5574DE1264756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vaW5pdC9tYWluLnRzIiwgIi4uL2luaXQvbGliL2dpdGh1Yi50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsKICAgICJpbXBvcnQgKiBhcyBmcyBmcm9tICdub2RlOmZzJ1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdub2RlOnBhdGgnXG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAnbm9kZTp1cmwnXG5cbmltcG9ydCB7IGRlYnVnLCBnZXRJbnB1dCwgaW5mbywgc2F2ZVN0YXRlLCBzZXRGYWlsZWQgfSBmcm9tICdAYWN0aW9ucy9jb3JlJ1xuaW1wb3J0IHsgZXhlYyB9IGZyb20gJ0BhY3Rpb25zL2V4ZWMnXG5cbmltcG9ydCB7IGdldFB1bGxSZXF1ZXN0TnVtYmVyIH0gZnJvbSAnLi9saWIvZ2l0aHViLmpzJ1xuXG5hc3luYyBmdW5jdGlvbiBtYWluKCkge1xuXHRsZXQgY3dkID0gcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksICcuc2xvJylcblx0bGV0IHdvcmtsb2FkID0gZ2V0SW5wdXQoJ3dvcmtsb2FkX25hbWUnKSB8fCAndW5zcGVjaWZpZWQnXG5cblx0c2F2ZVN0YXRlKCdjd2QnLCBjd2QpXG5cdHNhdmVTdGF0ZSgnd29ya2xvYWQnLCB3b3JrbG9hZClcblxuXHRmcy5ta2RpclN5bmMoY3dkLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KVxuXG5cdGxldCBwck51bWJlciA9IGF3YWl0IGdldFB1bGxSZXF1ZXN0TnVtYmVyKClcblx0aWYgKCFwck51bWJlcikge1xuXHRcdHNldEZhaWxlZCgnUHVsbCByZXF1ZXN0IG51bWJlciBub3QgZm91bmQnKVxuXHRcdHJldHVyblxuXHR9XG5cblx0c2F2ZVN0YXRlKCdwdWxsJywgcHJOdW1iZXIpXG5cblx0e1xuXHRcdGxldCBwdWxsUGF0aCA9IHBhdGguam9pbihjd2QsIGAke3dvcmtsb2FkfS1wdWxsLnR4dGApXG5cdFx0c2F2ZVN0YXRlKCdwdWxsX2luZm9fcGF0aCcsIHB1bGxQYXRoKVxuXHRcdGZzLndyaXRlRmlsZVN5bmMocHVsbFBhdGgsIHByTnVtYmVyLnRvRml4ZWQoMCksIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSlcblxuXHRcdGRlYnVnKGBQdWxsIHJlcXVlc3QgaW5mb3JtYXRpb24gc2F2ZWQgdG8gJHtwdWxsUGF0aH1gKVxuXHR9XG5cblx0e1xuXHRcdGxldCBhY3Rpb25Sb290ID0gcGF0aC5yZXNvbHZlKHBhdGguZGlybmFtZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCkpLCAnLi4vLi4vJylcblx0XHRsZXQgZGVwbG95UGF0aCA9IHBhdGguam9pbihhY3Rpb25Sb290LCAnZGVwbG95JylcblxuXHRcdGlmICghZnMuZXhpc3RzU3luYyhkZXBsb3lQYXRoKSkge1xuXHRcdFx0c2V0RmFpbGVkKGBEZXBsb3kgYXNzZXRzIG5vdCBmb3VuZCBhdCAke2RlcGxveVBhdGh9YClcblx0XHRcdHJldHVyblxuXHRcdH1cblxuXHRcdGZvciAobGV0IGVudHJ5IG9mIGZzLnJlYWRkaXJTeW5jKGRlcGxveVBhdGgpKSB7XG5cdFx0XHRsZXQgc3JjID0gcGF0aC5qb2luKGRlcGxveVBhdGgsIGVudHJ5KVxuXHRcdFx0bGV0IGRlc3QgPSBwYXRoLmpvaW4oY3dkLCBlbnRyeSlcblx0XHRcdGZzLmNwU3luYyhzcmMsIGRlc3QsIHsgcmVjdXJzaXZlOiB0cnVlIH0pXG5cdFx0fVxuXG5cdFx0ZGVidWcoYERlcGxveSBhc3NldHMgY29waWVkIHRvICR7Y3dkfWApXG5cdH1cblxuXHR7XG5cdFx0YXdhaXQgZXhlYyhgZG9ja2VyYCwgW2Bjb21wb3NlYCwgYC1mYCwgYGNvbXBvc2UueW1sYCwgYHVwYCwgYC0tcXVpZXQtcHVsbGAsIGAtZGBdLCB7IGN3ZCB9KVxuXHR9XG5cblx0bGV0IHN0YXJ0ID0gbmV3IERhdGUoKVxuXHRpbmZvKGBZREIgc3RhcnRlZCBhdCAke3N0YXJ0fWApXG5cdHNhdmVTdGF0ZSgnc3RhcnQnLCBzdGFydC50b0lTT1N0cmluZygpKVxufVxuXG5tYWluKClcbiIsCiAgICAiaW1wb3J0IHsgZ2V0SW5wdXQgfSBmcm9tICdAYWN0aW9ucy9jb3JlJ1xuaW1wb3J0IHsgY29udGV4dCwgZ2V0T2N0b2tpdCB9IGZyb20gJ0BhY3Rpb25zL2dpdGh1YidcblxuLyoqXG4gKiBSZXNvbHZlcyBwdWxsIHJlcXVlc3QgbnVtYmVyIGZyb20gaW5wdXQsIGNvbnRleHQsIG9yIEFQSVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0UHVsbFJlcXVlc3ROdW1iZXIoKTogUHJvbWlzZTxudW1iZXIgfCBudWxsPiB7XG5cdGxldCBleHBsaWNpdFByTnVtYmVyID0gZ2V0SW5wdXQoJ2dpdGh1Yl9wdWxsX3JlcXVlc3RfbnVtYmVyJylcblx0aWYgKGV4cGxpY2l0UHJOdW1iZXIpIHtcblx0XHRyZXR1cm4gTnVtYmVyLnBhcnNlSW50KGV4cGxpY2l0UHJOdW1iZXIsIDEwKVxuXHR9XG5cblx0aWYgKGNvbnRleHQucGF5bG9hZC5wdWxsX3JlcXVlc3QpIHtcblx0XHRyZXR1cm4gY29udGV4dC5wYXlsb2FkLnB1bGxfcmVxdWVzdC5udW1iZXJcblx0fVxuXG5cdGxldCB0b2tlbiA9IGdldElucHV0KCdnaXRodWJfdG9rZW4nKVxuXHRpZiAoIXRva2VuKSB7XG5cdFx0cmV0dXJuIG51bGxcblx0fVxuXG5cdHRyeSB7XG5cdFx0bGV0IHsgZGF0YSB9ID0gYXdhaXQgZ2V0T2N0b2tpdCh0b2tlbikucmVzdC5yZXBvcy5saXN0UHVsbFJlcXVlc3RzQXNzb2NpYXRlZFdpdGhDb21taXQoe1xuXHRcdFx0b3duZXI6IGNvbnRleHQucmVwby5vd25lcixcblx0XHRcdHJlcG86IGNvbnRleHQucmVwby5yZXBvLFxuXHRcdFx0Y29tbWl0X3NoYTogY29udGV4dC5zaGEsXG5cdFx0fSlcblxuXHRcdGlmIChkYXRhLmxlbmd0aCA+IDApIHtcblx0XHRcdHJldHVybiBkYXRhWzBdLm51bWJlclxuXHRcdH1cblx0fSBjYXRjaCB7XG5cdFx0cmV0dXJuIG51bGxcblx0fVxuXG5cdHJldHVybiBudWxsXG59XG4iCiAgXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7OztBQUlBLCtDQUNBO0FBTEE7QUFDQTtBQUNBOzs7QUNGQSw4Q0FDQTtBQUtBLGVBQXNCLG9CQUFvQixHQUEyQjtBQUFBLEVBQ3BFLElBQUksbUJBQW1CLHFCQUFTLDRCQUE0QjtBQUFBLEVBQzVELElBQUk7QUFBQSxJQUNILE9BQU8sT0FBTyxTQUFTLGtCQUFrQixFQUFFO0FBQUEsRUFHNUMsSUFBSSxzQkFBUSxRQUFRO0FBQUEsSUFDbkIsT0FBTyxzQkFBUSxRQUFRLGFBQWE7QUFBQSxFQUdyQyxJQUFJLFFBQVEscUJBQVMsY0FBYztBQUFBLEVBQ25DLElBQUksQ0FBQztBQUFBLElBQ0osT0FBTztBQUFBLEVBR1IsSUFBSTtBQUFBLElBQ0gsTUFBTSxTQUFTLE1BQU0seUJBQVcsS0FBSyxFQUFFLEtBQUssTUFBTSxxQ0FBcUM7QUFBQSxNQUN0RixPQUFPLHNCQUFRLEtBQUs7QUFBQSxNQUNwQixNQUFNLHNCQUFRLEtBQUs7QUFBQSxNQUNuQixZQUFZLHNCQUFRO0FBQUEsSUFDckIsQ0FBQztBQUFBLElBRUQsSUFBSSxLQUFLLFNBQVM7QUFBQSxNQUNqQixPQUFPLEtBQUssR0FBRztBQUFBLElBRWYsTUFBTTtBQUFBLElBQ1AsT0FBTztBQUFBO0FBQUEsRUFHUixPQUFPO0FBQUE7OztBRDFCUixlQUFlLElBQUksR0FBRztBQUFBLEVBQ3JCLElBQUksTUFBVyxVQUFLLFFBQVEsSUFBSSxHQUFHLE1BQU0sR0FDckMsV0FBVyxzQkFBUyxlQUFlLEtBQUs7QUFBQSxFQUU1Qyx1QkFBVSxPQUFPLEdBQUcsR0FDcEIsdUJBQVUsWUFBWSxRQUFRLEdBRTNCLGFBQVUsS0FBSyxFQUFFLFdBQVcsR0FBSyxDQUFDO0FBQUEsRUFFckMsSUFBSSxXQUFXLE1BQU0scUJBQXFCO0FBQUEsRUFDMUMsSUFBSSxDQUFDLFVBQVU7QUFBQSxJQUNkLHVCQUFVLCtCQUErQjtBQUFBLElBQ3pDO0FBQUE7QUFBQSxFQUdELHVCQUFVLFFBQVEsUUFBUTtBQUFBLEVBRTFCO0FBQUEsSUFDQyxJQUFJLFdBQWdCLFVBQUssS0FBSyxHQUFHLG1CQUFtQjtBQUFBLElBQ3BELHVCQUFVLGtCQUFrQixRQUFRLEdBQ2pDLGlCQUFjLFVBQVUsU0FBUyxRQUFRLENBQUMsR0FBRyxFQUFFLFVBQVUsUUFBUSxDQUFDLEdBRXJFLG1CQUFNLHFDQUFxQyxVQUFVO0FBQUEsRUFDdEQ7QUFBQSxFQUVBO0FBQUEsSUFDQyxJQUFJLGFBQWtCLGFBQWEsYUFBUSxjQUFjLFlBQVksR0FBRyxDQUFDLEdBQUcsUUFBUSxHQUNoRixhQUFrQixVQUFLLFlBQVksUUFBUTtBQUFBLElBRS9DLElBQUksQ0FBSSxjQUFXLFVBQVUsR0FBRztBQUFBLE1BQy9CLHVCQUFVLDhCQUE4QixZQUFZO0FBQUEsTUFDcEQ7QUFBQTtBQUFBLElBR0QsU0FBUyxTQUFZLGVBQVksVUFBVSxHQUFHO0FBQUEsTUFDN0MsSUFBSSxNQUFXLFVBQUssWUFBWSxLQUFLLEdBQ2pDLE9BQVksVUFBSyxLQUFLLEtBQUs7QUFBQSxNQUM1QixVQUFPLEtBQUssTUFBTSxFQUFFLFdBQVcsR0FBSyxDQUFDO0FBQUE7QUFBQSxJQUd6QyxtQkFBTSwyQkFBMkIsS0FBSztBQUFBLEVBQ3ZDO0FBQUEsRUFHQyxNQUFNLGlCQUFLLFVBQVUsQ0FBQyxXQUFXLE1BQU0sZUFBZSxNQUFNLGdCQUFnQixJQUFJLEdBQUcsRUFBRSxJQUFJLENBQUM7QUFBQSxFQUczRixJQUFJLHdCQUFRLElBQUk7QUFBQSxFQUNoQixrQkFBSyxrQkFBa0IsT0FBTyxHQUM5Qix1QkFBVSxTQUFTLE1BQU0sWUFBWSxDQUFDO0FBQUE7QUFHdkMsS0FBSzsiLAogICJkZWJ1Z0lkIjogIkZBNjY1RUJCNTU3NERFMTI2NDc1NkUyMTY0NzU2RTIxIiwKICAibmFtZXMiOiBbXQp9
