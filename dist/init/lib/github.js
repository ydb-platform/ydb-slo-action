import {
  require_github
} from "../../main-ab3q65z6.js";
import"../../main-yansfnd3.js";
import {
  require_core
} from "../../main-d4h7eace.js";
import"../../main-c7r720rd.js";
import {
  __toESM
} from "../../main-ynsbc1hx.js";

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
export {
  getPullRequestNumber
};

export { getPullRequestNumber };

//# debugId=132BAE9D7BA52C9064756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vaW5pdC9saWIvZ2l0aHViLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWwogICAgImltcG9ydCB7IGdldElucHV0IH0gZnJvbSAnQGFjdGlvbnMvY29yZSdcbmltcG9ydCB7IGNvbnRleHQsIGdldE9jdG9raXQgfSBmcm9tICdAYWN0aW9ucy9naXRodWInXG5cbi8qKlxuICogUmVzb2x2ZXMgcHVsbCByZXF1ZXN0IG51bWJlciBmcm9tIGlucHV0LCBjb250ZXh0LCBvciBBUElcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFB1bGxSZXF1ZXN0TnVtYmVyKCk6IFByb21pc2U8bnVtYmVyIHwgbnVsbD4ge1xuXHRsZXQgZXhwbGljaXRQck51bWJlciA9IGdldElucHV0KCdnaXRodWJfcHVsbF9yZXF1ZXN0X251bWJlcicpXG5cdGlmIChleHBsaWNpdFByTnVtYmVyKSB7XG5cdFx0cmV0dXJuIE51bWJlci5wYXJzZUludChleHBsaWNpdFByTnVtYmVyLCAxMClcblx0fVxuXG5cdGlmIChjb250ZXh0LnBheWxvYWQucHVsbF9yZXF1ZXN0KSB7XG5cdFx0cmV0dXJuIGNvbnRleHQucGF5bG9hZC5wdWxsX3JlcXVlc3QubnVtYmVyXG5cdH1cblxuXHRsZXQgdG9rZW4gPSBnZXRJbnB1dCgnZ2l0aHViX3Rva2VuJylcblx0aWYgKCF0b2tlbikge1xuXHRcdHJldHVybiBudWxsXG5cdH1cblxuXHR0cnkge1xuXHRcdGxldCB7IGRhdGEgfSA9IGF3YWl0IGdldE9jdG9raXQodG9rZW4pLnJlc3QucmVwb3MubGlzdFB1bGxSZXF1ZXN0c0Fzc29jaWF0ZWRXaXRoQ29tbWl0KHtcblx0XHRcdG93bmVyOiBjb250ZXh0LnJlcG8ub3duZXIsXG5cdFx0XHRyZXBvOiBjb250ZXh0LnJlcG8ucmVwbyxcblx0XHRcdGNvbW1pdF9zaGE6IGNvbnRleHQuc2hhLFxuXHRcdH0pXG5cblx0XHRpZiAoZGF0YS5sZW5ndGggPiAwKSB7XG5cdFx0XHRyZXR1cm4gZGF0YVswXS5udW1iZXJcblx0XHR9XG5cdH0gY2F0Y2gge1xuXHRcdHJldHVybiBudWxsXG5cdH1cblxuXHRyZXR1cm4gbnVsbFxufVxuIgogIF0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7OztBQUFBLDhDQUNBO0FBS0EsZUFBc0Isb0JBQW9CLEdBQTJCO0FBQUEsRUFDcEUsSUFBSSxtQkFBbUIscUJBQVMsNEJBQTRCO0FBQUEsRUFDNUQsSUFBSTtBQUFBLElBQ0gsT0FBTyxPQUFPLFNBQVMsa0JBQWtCLEVBQUU7QUFBQSxFQUc1QyxJQUFJLHNCQUFRLFFBQVE7QUFBQSxJQUNuQixPQUFPLHNCQUFRLFFBQVEsYUFBYTtBQUFBLEVBR3JDLElBQUksUUFBUSxxQkFBUyxjQUFjO0FBQUEsRUFDbkMsSUFBSSxDQUFDO0FBQUEsSUFDSixPQUFPO0FBQUEsRUFHUixJQUFJO0FBQUEsSUFDSCxNQUFNLFNBQVMsTUFBTSx5QkFBVyxLQUFLLEVBQUUsS0FBSyxNQUFNLHFDQUFxQztBQUFBLE1BQ3RGLE9BQU8sc0JBQVEsS0FBSztBQUFBLE1BQ3BCLE1BQU0sc0JBQVEsS0FBSztBQUFBLE1BQ25CLFlBQVksc0JBQVE7QUFBQSxJQUNyQixDQUFDO0FBQUEsSUFFRCxJQUFJLEtBQUssU0FBUztBQUFBLE1BQ2pCLE9BQU8sS0FBSyxHQUFHO0FBQUEsSUFFZixNQUFNO0FBQUEsSUFDUCxPQUFPO0FBQUE7QUFBQSxFQUdSLE9BQU87QUFBQTsiLAogICJkZWJ1Z0lkIjogIjEzMkJBRTlEN0JBNTJDOTA2NDc1NkUyMTY0NzU2RTIxIiwKICAibmFtZXMiOiBbXQp9
