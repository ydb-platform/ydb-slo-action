import {
  require_github
} from "../main-pk20nx4h.js";
import {
  __toESM,
  require_core,
  require_exec
} from "../main-vn0vc56g.js";

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

//# debugId=CD98E8A0371AE4FC64756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vaW5pdC9tYWluLnRzIiwgIi4uL2luaXQvbGliL2dpdGh1Yi50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsKICAgICJpbXBvcnQgKiBhcyBmcyBmcm9tICdub2RlOmZzJ1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdub2RlOnBhdGgnXG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAnbm9kZTp1cmwnXG5cbmltcG9ydCB7IGRlYnVnLCBnZXRJbnB1dCwgaW5mbywgc2F2ZVN0YXRlLCBzZXRGYWlsZWQgfSBmcm9tICdAYWN0aW9ucy9jb3JlJ1xuaW1wb3J0IHsgZXhlYyB9IGZyb20gJ0BhY3Rpb25zL2V4ZWMnXG5cbmltcG9ydCB7IGdldFB1bGxSZXF1ZXN0TnVtYmVyIH0gZnJvbSAnLi9saWIvZ2l0aHViLmpzJ1xuXG5hc3luYyBmdW5jdGlvbiBtYWluKCkge1xuXHRsZXQgY3dkID0gcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksICcuc2xvJylcblx0bGV0IHdvcmtsb2FkID0gZ2V0SW5wdXQoJ3dvcmtsb2FkX25hbWUnKSB8fCAndW5zcGVjaWZpZWQnXG5cblx0c2F2ZVN0YXRlKCdjd2QnLCBjd2QpXG5cdHNhdmVTdGF0ZSgnd29ya2xvYWQnLCB3b3JrbG9hZClcblxuXHRmcy5ta2RpclN5bmMoY3dkLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KVxuXG5cdGxldCBwck51bWJlciA9IGF3YWl0IGdldFB1bGxSZXF1ZXN0TnVtYmVyKClcblx0aWYgKCFwck51bWJlcikge1xuXHRcdHNldEZhaWxlZCgnUHVsbCByZXF1ZXN0IG51bWJlciBub3QgZm91bmQnKVxuXHRcdHJldHVyblxuXHR9XG5cblx0c2F2ZVN0YXRlKCdwdWxsJywgcHJOdW1iZXIpXG5cblx0e1xuXHRcdGxldCBwdWxsUGF0aCA9IHBhdGguam9pbihjd2QsIGAke3dvcmtsb2FkfS1wdWxsLnR4dGApXG5cdFx0c2F2ZVN0YXRlKCdwdWxsX2luZm9fcGF0aCcsIHB1bGxQYXRoKVxuXHRcdGZzLndyaXRlRmlsZVN5bmMocHVsbFBhdGgsIHByTnVtYmVyLnRvRml4ZWQoMCksIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSlcblxuXHRcdGRlYnVnKGBQdWxsIHJlcXVlc3QgaW5mb3JtYXRpb24gc2F2ZWQgdG8gJHtwdWxsUGF0aH1gKVxuXHR9XG5cblx0e1xuXHRcdGxldCBhY3Rpb25Sb290ID0gcGF0aC5yZXNvbHZlKHBhdGguZGlybmFtZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCkpLCAnLi4vLi4vJylcblx0XHRsZXQgZGVwbG95UGF0aCA9IHBhdGguam9pbihhY3Rpb25Sb290LCAnZGVwbG95JylcblxuXHRcdGlmICghZnMuZXhpc3RzU3luYyhkZXBsb3lQYXRoKSkge1xuXHRcdFx0c2V0RmFpbGVkKGBEZXBsb3kgYXNzZXRzIG5vdCBmb3VuZCBhdCAke2RlcGxveVBhdGh9YClcblx0XHRcdHJldHVyblxuXHRcdH1cblxuXHRcdGZvciAobGV0IGVudHJ5IG9mIGZzLnJlYWRkaXJTeW5jKGRlcGxveVBhdGgpKSB7XG5cdFx0XHRsZXQgc3JjID0gcGF0aC5qb2luKGRlcGxveVBhdGgsIGVudHJ5KVxuXHRcdFx0bGV0IGRlc3QgPSBwYXRoLmpvaW4oY3dkLCBlbnRyeSlcblx0XHRcdGZzLmNwU3luYyhzcmMsIGRlc3QsIHsgcmVjdXJzaXZlOiB0cnVlIH0pXG5cdFx0fVxuXG5cdFx0ZGVidWcoYERlcGxveSBhc3NldHMgY29waWVkIHRvICR7Y3dkfWApXG5cdH1cblxuXHR7XG5cdFx0YXdhaXQgZXhlYyhgZG9ja2VyYCwgW2Bjb21wb3NlYCwgYC1mYCwgYGNvbXBvc2UueW1sYCwgYHVwYCwgYC0tcXVpZXQtcHVsbGAsIGAtZGBdLCB7IGN3ZCB9KVxuXHR9XG5cblx0bGV0IHN0YXJ0ID0gbmV3IERhdGUoKVxuXHRpbmZvKGBZREIgc3RhcnRlZCBhdCAke3N0YXJ0fWApXG5cdHNhdmVTdGF0ZSgnc3RhcnQnLCBzdGFydC50b0lTT1N0cmluZygpKVxufVxuXG5tYWluKClcbiIsCiAgICAiaW1wb3J0IHsgZ2V0SW5wdXQgfSBmcm9tICdAYWN0aW9ucy9jb3JlJ1xuaW1wb3J0IHsgY29udGV4dCwgZ2V0T2N0b2tpdCB9IGZyb20gJ0BhY3Rpb25zL2dpdGh1YidcblxuLyoqXG4gKiBSZXNvbHZlcyBwdWxsIHJlcXVlc3QgbnVtYmVyIGZyb20gaW5wdXQsIGNvbnRleHQsIG9yIEFQSVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0UHVsbFJlcXVlc3ROdW1iZXIoKTogUHJvbWlzZTxudW1iZXIgfCBudWxsPiB7XG5cdGxldCBleHBsaWNpdFByTnVtYmVyID0gZ2V0SW5wdXQoJ2dpdGh1Yl9wdWxsX3JlcXVlc3RfbnVtYmVyJylcblx0aWYgKGV4cGxpY2l0UHJOdW1iZXIpIHtcblx0XHRyZXR1cm4gTnVtYmVyLnBhcnNlSW50KGV4cGxpY2l0UHJOdW1iZXIsIDEwKVxuXHR9XG5cblx0aWYgKGNvbnRleHQucGF5bG9hZC5wdWxsX3JlcXVlc3QpIHtcblx0XHRyZXR1cm4gY29udGV4dC5wYXlsb2FkLnB1bGxfcmVxdWVzdC5udW1iZXJcblx0fVxuXG5cdGxldCB0b2tlbiA9IGdldElucHV0KCdnaXRodWJfdG9rZW4nKVxuXHRpZiAoIXRva2VuKSB7XG5cdFx0cmV0dXJuIG51bGxcblx0fVxuXG5cdHRyeSB7XG5cdFx0bGV0IHsgZGF0YSB9ID0gYXdhaXQgZ2V0T2N0b2tpdCh0b2tlbikucmVzdC5yZXBvcy5saXN0UHVsbFJlcXVlc3RzQXNzb2NpYXRlZFdpdGhDb21taXQoe1xuXHRcdFx0b3duZXI6IGNvbnRleHQucmVwby5vd25lcixcblx0XHRcdHJlcG86IGNvbnRleHQucmVwby5yZXBvLFxuXHRcdFx0Y29tbWl0X3NoYTogY29udGV4dC5zaGEsXG5cdFx0fSlcblxuXHRcdGlmIChkYXRhLmxlbmd0aCA+IDApIHtcblx0XHRcdHJldHVybiBkYXRhWzBdLm51bWJlclxuXHRcdH1cblx0fSBjYXRjaCB7XG5cdFx0cmV0dXJuIG51bGxcblx0fVxuXG5cdHJldHVybiBudWxsXG59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
