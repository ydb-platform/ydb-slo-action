import {
  collectMetrics,
  parseMetricsYaml
} from "./lib/metrics.js";
import"./lib/prometheus.js";
import {
  uploadArtifacts
} from "./lib/artifacts.js";
import"../main-gfg7sja2.js";
import {
  collectComposeLogs,
  collectDockerEvents,
  getContainerIp,
  stopCompose
} from "./lib/docker.js";
import"../main-yansfnd3.js";
import {
  require_core
} from "../main-d4h7eace.js";
import"../main-c7r720rd.js";
import {
  __toESM
} from "../main-ynsbc1hx.js";

// init/post.ts
var import_core = __toESM(require_core(), 1);
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
async function post() {
  let cwd = import_core.getState("cwd"), workload = import_core.getState("workload"), start = new Date(import_core.getState("start")), finish = /* @__PURE__ */ new Date, duration = finish.getTime() - start.getTime(), pullPath = import_core.getState("pull_info_path"), logsPath = path.join(cwd, `${workload}-logs.txt`), eventsPath = path.join(cwd, `${workload}-events.jsonl`), metricsPath = path.join(cwd, `${workload}-metrics.jsonl`), prometheusIp = await getContainerIp("prometheus", cwd), prometheusUrl = prometheusIp ? `http://${prometheusIp}:9090` : "http://localhost:9090";
  import_core.debug(`Prometheus URL: ${prometheusUrl}`);
  let actionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../"), defaultMetricsPath = path.join(actionRoot, "deploy", "metrics.yaml"), metricsYaml = fs.readFileSync(defaultMetricsPath, { encoding: "utf-8" }), customMetricsYaml = import_core.getInput("metrics_yaml");
  if (import_core.getInput("metrics_yaml_path")) {
    let customMetricsPath = import_core.getInput("metrics_yaml_path");
    if (!fs.existsSync(customMetricsPath))
      import_core.warning(`Custom metrics file not found: ${customMetricsPath}`);
    else
      customMetricsYaml = fs.readFileSync(customMetricsPath, { encoding: "utf-8" });
  }
  {
    import_core.info("Collecting logs...");
    let logs = await collectComposeLogs(cwd);
    fs.writeFileSync(logsPath, logs, { encoding: "utf-8" });
  }
  {
    import_core.info("Collecting events...");
    let content = (await collectDockerEvents({
      cwd,
      since: start,
      until: finish
    })).map((e) => JSON.stringify(e)).join(`
`);
    fs.writeFileSync(eventsPath, content, { encoding: "utf-8" });
  }
  {
    import_core.info("Collecting metrics...");
    let metricsDef = [];
    if (metricsYaml) {
      let defaultMetrics = await parseMetricsYaml(metricsYaml);
      metricsDef.push(...defaultMetrics);
    }
    if (customMetricsYaml) {
      let customMetrics = await parseMetricsYaml(customMetricsYaml);
      metricsDef.push(...customMetrics);
    }
    let content = (await collectMetrics({
      url: prometheusUrl,
      start: start.getTime() / 1000,
      end: finish.getTime() / 1000,
      metrics: metricsDef,
      timeout: 30000
    })).map((m) => JSON.stringify(m)).join(`
`);
    fs.writeFileSync(metricsPath, content, { encoding: "utf-8" });
  }
  import_core.info("Stopping YDB services..."), await stopCompose(cwd);
  {
    import_core.info("Uploading artifacts...");
    let artifacts = [
      { name: `${workload}-pull.txt`, path: pullPath },
      { name: `${workload}-logs.txt`, path: logsPath },
      { name: `${workload}-events.jsonl`, path: eventsPath },
      { name: `${workload}-metrics.jsonl`, path: metricsPath }
    ];
    await uploadArtifacts(workload, artifacts, cwd);
  }
  import_core.info(`YDB SLO Test duration: ${(duration / 1000).toFixed(1)}s`);
}
post();

//# debugId=10844772F81508D764756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vaW5pdC9wb3N0LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWwogICAgImltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ25vZGU6cGF0aCdcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICdub2RlOnVybCdcblxuaW1wb3J0IHsgZGVidWcsIGdldElucHV0LCBnZXRTdGF0ZSwgaW5mbywgd2FybmluZyB9IGZyb20gJ0BhY3Rpb25zL2NvcmUnXG5cbmltcG9ydCB7IHVwbG9hZEFydGlmYWN0cywgdHlwZSBBcnRpZmFjdEZpbGUgfSBmcm9tICcuL2xpYi9hcnRpZmFjdHMuanMnXG5pbXBvcnQgeyBjb2xsZWN0Q29tcG9zZUxvZ3MsIGNvbGxlY3REb2NrZXJFdmVudHMsIGdldENvbnRhaW5lcklwLCBzdG9wQ29tcG9zZSB9IGZyb20gJy4vbGliL2RvY2tlci5qcydcbmltcG9ydCB7IGNvbGxlY3RNZXRyaWNzLCBwYXJzZU1ldHJpY3NZYW1sLCB0eXBlIE1ldHJpY0RlZmluaXRpb24gfSBmcm9tICcuL2xpYi9tZXRyaWNzLmpzJ1xuXG5hc3luYyBmdW5jdGlvbiBwb3N0KCkge1xuXHRsZXQgY3dkID0gZ2V0U3RhdGUoJ2N3ZCcpXG5cdGxldCB3b3JrbG9hZCA9IGdldFN0YXRlKCd3b3JrbG9hZCcpXG5cblx0bGV0IHN0YXJ0ID0gbmV3IERhdGUoZ2V0U3RhdGUoJ3N0YXJ0JykpXG5cdGxldCBmaW5pc2ggPSBuZXcgRGF0ZSgpXG5cdGxldCBkdXJhdGlvbiA9IGZpbmlzaC5nZXRUaW1lKCkgLSBzdGFydC5nZXRUaW1lKClcblxuXHRsZXQgcHVsbFBhdGggPSBnZXRTdGF0ZSgncHVsbF9pbmZvX3BhdGgnKVxuXHRsZXQgbG9nc1BhdGggPSBwYXRoLmpvaW4oY3dkLCBgJHt3b3JrbG9hZH0tbG9ncy50eHRgKVxuXHRsZXQgZXZlbnRzUGF0aCA9IHBhdGguam9pbihjd2QsIGAke3dvcmtsb2FkfS1ldmVudHMuanNvbmxgKVxuXHRsZXQgbWV0cmljc1BhdGggPSBwYXRoLmpvaW4oY3dkLCBgJHt3b3JrbG9hZH0tbWV0cmljcy5qc29ubGApXG5cblx0bGV0IHByb21ldGhldXNJcCA9IGF3YWl0IGdldENvbnRhaW5lcklwKCdwcm9tZXRoZXVzJywgY3dkKVxuXHRsZXQgcHJvbWV0aGV1c1VybCA9IHByb21ldGhldXNJcCA/IGBodHRwOi8vJHtwcm9tZXRoZXVzSXB9OjkwOTBgIDogJ2h0dHA6Ly9sb2NhbGhvc3Q6OTA5MCdcblx0ZGVidWcoYFByb21ldGhldXMgVVJMOiAke3Byb21ldGhldXNVcmx9YClcblxuXHRsZXQgYWN0aW9uUm9vdCA9IHBhdGgucmVzb2x2ZShwYXRoLmRpcm5hbWUoZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpKSwgJy4uLy4uLycpXG5cdGxldCBkZWZhdWx0TWV0cmljc1BhdGggPSBwYXRoLmpvaW4oYWN0aW9uUm9vdCwgJ2RlcGxveScsICdtZXRyaWNzLnlhbWwnKVxuXG5cdGxldCBtZXRyaWNzWWFtbCA9IGZzLnJlYWRGaWxlU3luYyhkZWZhdWx0TWV0cmljc1BhdGgsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSlcblx0bGV0IGN1c3RvbU1ldHJpY3NZYW1sID0gZ2V0SW5wdXQoJ21ldHJpY3NfeWFtbCcpXG5cblx0aWYgKGdldElucHV0KCdtZXRyaWNzX3lhbWxfcGF0aCcpKSB7XG5cdFx0bGV0IGN1c3RvbU1ldHJpY3NQYXRoID0gZ2V0SW5wdXQoJ21ldHJpY3NfeWFtbF9wYXRoJylcblx0XHRpZiAoIWZzLmV4aXN0c1N5bmMoY3VzdG9tTWV0cmljc1BhdGgpKSB7XG5cdFx0XHR3YXJuaW5nKGBDdXN0b20gbWV0cmljcyBmaWxlIG5vdCBmb3VuZDogJHtjdXN0b21NZXRyaWNzUGF0aH1gKVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRjdXN0b21NZXRyaWNzWWFtbCA9IGZzLnJlYWRGaWxlU3luYyhjdXN0b21NZXRyaWNzUGF0aCwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KVxuXHRcdH1cblx0fVxuXG5cdHtcblx0XHRpbmZvKCdDb2xsZWN0aW5nIGxvZ3MuLi4nKVxuXHRcdGxldCBsb2dzID0gYXdhaXQgY29sbGVjdENvbXBvc2VMb2dzKGN3ZClcblxuXHRcdGZzLndyaXRlRmlsZVN5bmMobG9nc1BhdGgsIGxvZ3MsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSlcblx0fVxuXG5cdHtcblx0XHRpbmZvKCdDb2xsZWN0aW5nIGV2ZW50cy4uLicpXG5cdFx0bGV0IGV2ZW50cyA9IGF3YWl0IGNvbGxlY3REb2NrZXJFdmVudHMoe1xuXHRcdFx0Y3dkLFxuXHRcdFx0c2luY2U6IHN0YXJ0LFxuXHRcdFx0dW50aWw6IGZpbmlzaCxcblx0XHR9KVxuXG5cdFx0bGV0IGNvbnRlbnQgPSBldmVudHMubWFwKChlKSA9PiBKU09OLnN0cmluZ2lmeShlKSkuam9pbignXFxuJylcblx0XHRmcy53cml0ZUZpbGVTeW5jKGV2ZW50c1BhdGgsIGNvbnRlbnQsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSlcblx0fVxuXG5cdHtcblx0XHRpbmZvKCdDb2xsZWN0aW5nIG1ldHJpY3MuLi4nKVxuXG5cdFx0bGV0IG1ldHJpY3NEZWY6IE1ldHJpY0RlZmluaXRpb25bXSA9IFtdXG5cblx0XHRpZiAobWV0cmljc1lhbWwpIHtcblx0XHRcdGxldCBkZWZhdWx0TWV0cmljcyA9IGF3YWl0IHBhcnNlTWV0cmljc1lhbWwobWV0cmljc1lhbWwpXG5cdFx0XHRtZXRyaWNzRGVmLnB1c2goLi4uZGVmYXVsdE1ldHJpY3MpXG5cdFx0fVxuXG5cdFx0aWYgKGN1c3RvbU1ldHJpY3NZYW1sKSB7XG5cdFx0XHRsZXQgY3VzdG9tTWV0cmljcyA9IGF3YWl0IHBhcnNlTWV0cmljc1lhbWwoY3VzdG9tTWV0cmljc1lhbWwpXG5cdFx0XHRtZXRyaWNzRGVmLnB1c2goLi4uY3VzdG9tTWV0cmljcylcblx0XHR9XG5cblx0XHRsZXQgbWV0cmljcyA9IGF3YWl0IGNvbGxlY3RNZXRyaWNzKHtcblx0XHRcdHVybDogcHJvbWV0aGV1c1VybCxcblx0XHRcdHN0YXJ0OiBzdGFydC5nZXRUaW1lKCkgLyAxMDAwLFxuXHRcdFx0ZW5kOiBmaW5pc2guZ2V0VGltZSgpIC8gMTAwMCxcblx0XHRcdG1ldHJpY3M6IG1ldHJpY3NEZWYsXG5cdFx0XHR0aW1lb3V0OiAzMDAwMCxcblx0XHR9KVxuXG5cdFx0bGV0IGNvbnRlbnQgPSBtZXRyaWNzLm1hcCgobSkgPT4gSlNPTi5zdHJpbmdpZnkobSkpLmpvaW4oJ1xcbicpXG5cdFx0ZnMud3JpdGVGaWxlU3luYyhtZXRyaWNzUGF0aCwgY29udGVudCwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KVxuXHR9XG5cblx0e1xuXHRcdGluZm8oJ1N0b3BwaW5nIFlEQiBzZXJ2aWNlcy4uLicpXG5cdFx0YXdhaXQgc3RvcENvbXBvc2UoY3dkKVxuXHR9XG5cblx0e1xuXHRcdGluZm8oJ1VwbG9hZGluZyBhcnRpZmFjdHMuLi4nKVxuXG5cdFx0bGV0IGFydGlmYWN0czogQXJ0aWZhY3RGaWxlW10gPSBbXG5cdFx0XHR7IG5hbWU6IGAke3dvcmtsb2FkfS1wdWxsLnR4dGAsIHBhdGg6IHB1bGxQYXRoIH0sXG5cdFx0XHR7IG5hbWU6IGAke3dvcmtsb2FkfS1sb2dzLnR4dGAsIHBhdGg6IGxvZ3NQYXRoIH0sXG5cdFx0XHR7IG5hbWU6IGAke3dvcmtsb2FkfS1ldmVudHMuanNvbmxgLCBwYXRoOiBldmVudHNQYXRoIH0sXG5cdFx0XHR7IG5hbWU6IGAke3dvcmtsb2FkfS1tZXRyaWNzLmpzb25sYCwgcGF0aDogbWV0cmljc1BhdGggfSxcblx0XHRdXG5cblx0XHRhd2FpdCB1cGxvYWRBcnRpZmFjdHMod29ya2xvYWQsIGFydGlmYWN0cywgY3dkKVxuXHR9XG5cblx0aW5mbyhgWURCIFNMTyBUZXN0IGR1cmF0aW9uOiAkeyhkdXJhdGlvbiAvIDEwMDApLnRvRml4ZWQoMSl9c2ApXG59XG5cbnBvc3QoKVxuIgogIF0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUlBO0FBSkE7QUFDQTtBQUNBO0FBUUEsZUFBZSxJQUFJLEdBQUc7QUFBQSxFQUNyQixJQUFJLE1BQU0scUJBQVMsS0FBSyxHQUNwQixXQUFXLHFCQUFTLFVBQVUsR0FFOUIsUUFBUSxJQUFJLEtBQUsscUJBQVMsT0FBTyxDQUFDLEdBQ2xDLHlCQUFTLElBQUksTUFDYixXQUFXLE9BQU8sUUFBUSxJQUFJLE1BQU0sUUFBUSxHQUU1QyxXQUFXLHFCQUFTLGdCQUFnQixHQUNwQyxXQUFnQixVQUFLLEtBQUssR0FBRyxtQkFBbUIsR0FDaEQsYUFBa0IsVUFBSyxLQUFLLEdBQUcsdUJBQXVCLEdBQ3RELGNBQW1CLFVBQUssS0FBSyxHQUFHLHdCQUF3QixHQUV4RCxlQUFlLE1BQU0sZUFBZSxjQUFjLEdBQUcsR0FDckQsZ0JBQWdCLGVBQWUsVUFBVSxzQkFBc0I7QUFBQSxFQUNuRSxrQkFBTSxtQkFBbUIsZUFBZTtBQUFBLEVBRXhDLElBQUksYUFBa0IsYUFBYSxhQUFRLGNBQWMsWUFBWSxHQUFHLENBQUMsR0FBRyxRQUFRLEdBQ2hGLHFCQUEwQixVQUFLLFlBQVksVUFBVSxjQUFjLEdBRW5FLGNBQWlCLGdCQUFhLG9CQUFvQixFQUFFLFVBQVUsUUFBUSxDQUFDLEdBQ3ZFLG9CQUFvQixxQkFBUyxjQUFjO0FBQUEsRUFFL0MsSUFBSSxxQkFBUyxtQkFBbUIsR0FBRztBQUFBLElBQ2xDLElBQUksb0JBQW9CLHFCQUFTLG1CQUFtQjtBQUFBLElBQ3BELElBQUksQ0FBSSxjQUFXLGlCQUFpQjtBQUFBLE1BQ25DLG9CQUFRLGtDQUFrQyxtQkFBbUI7QUFBQSxJQUU3RDtBQUFBLDBCQUF1QixnQkFBYSxtQkFBbUIsRUFBRSxVQUFVLFFBQVEsQ0FBQztBQUFBO0FBQUEsRUFJOUU7QUFBQSxJQUNDLGlCQUFLLG9CQUFvQjtBQUFBLElBQ3pCLElBQUksT0FBTyxNQUFNLG1CQUFtQixHQUFHO0FBQUEsSUFFcEMsaUJBQWMsVUFBVSxNQUFNLEVBQUUsVUFBVSxRQUFRLENBQUM7QUFBQSxFQUN2RDtBQUFBLEVBRUE7QUFBQSxJQUNDLGlCQUFLLHNCQUFzQjtBQUFBLElBTzNCLElBQUksV0FOUyxNQUFNLG9CQUFvQjtBQUFBLE1BQ3RDO0FBQUEsTUFDQSxPQUFPO0FBQUEsTUFDUCxPQUFPO0FBQUEsSUFDUixDQUFDLEdBRW9CLElBQUksQ0FBQyxNQUFNLEtBQUssVUFBVSxDQUFDLENBQUMsRUFBRSxLQUFLO0FBQUEsQ0FBSTtBQUFBLElBQ3pELGlCQUFjLFlBQVksU0FBUyxFQUFFLFVBQVUsUUFBUSxDQUFDO0FBQUEsRUFDNUQ7QUFBQSxFQUVBO0FBQUEsSUFDQyxpQkFBSyx1QkFBdUI7QUFBQSxJQUU1QixJQUFJLGFBQWlDLENBQUM7QUFBQSxJQUV0QyxJQUFJLGFBQWE7QUFBQSxNQUNoQixJQUFJLGlCQUFpQixNQUFNLGlCQUFpQixXQUFXO0FBQUEsTUFDdkQsV0FBVyxLQUFLLEdBQUcsY0FBYztBQUFBO0FBQUEsSUFHbEMsSUFBSSxtQkFBbUI7QUFBQSxNQUN0QixJQUFJLGdCQUFnQixNQUFNLGlCQUFpQixpQkFBaUI7QUFBQSxNQUM1RCxXQUFXLEtBQUssR0FBRyxhQUFhO0FBQUE7QUFBQSxJQVdqQyxJQUFJLFdBUlUsTUFBTSxlQUFlO0FBQUEsTUFDbEMsS0FBSztBQUFBLE1BQ0wsT0FBTyxNQUFNLFFBQVEsSUFBSTtBQUFBLE1BQ3pCLEtBQUssT0FBTyxRQUFRLElBQUk7QUFBQSxNQUN4QixTQUFTO0FBQUEsTUFDVCxTQUFTO0FBQUEsSUFDVixDQUFDLEdBRXFCLElBQUksQ0FBQyxNQUFNLEtBQUssVUFBVSxDQUFDLENBQUMsRUFBRSxLQUFLO0FBQUEsQ0FBSTtBQUFBLElBQzFELGlCQUFjLGFBQWEsU0FBUyxFQUFFLFVBQVUsUUFBUSxDQUFDO0FBQUEsRUFDN0Q7QUFBQSxFQUdDLGlCQUFLLDBCQUEwQixHQUMvQixNQUFNLFlBQVksR0FBRztBQUFBLEVBR3RCO0FBQUEsSUFDQyxpQkFBSyx3QkFBd0I7QUFBQSxJQUU3QixJQUFJLFlBQTRCO0FBQUEsTUFDL0IsRUFBRSxNQUFNLEdBQUcscUJBQXFCLE1BQU0sU0FBUztBQUFBLE1BQy9DLEVBQUUsTUFBTSxHQUFHLHFCQUFxQixNQUFNLFNBQVM7QUFBQSxNQUMvQyxFQUFFLE1BQU0sR0FBRyx5QkFBeUIsTUFBTSxXQUFXO0FBQUEsTUFDckQsRUFBRSxNQUFNLEdBQUcsMEJBQTBCLE1BQU0sWUFBWTtBQUFBLElBQ3hEO0FBQUEsSUFFQSxNQUFNLGdCQUFnQixVQUFVLFdBQVcsR0FBRztBQUFBLEVBQy9DO0FBQUEsRUFFQSxpQkFBSywyQkFBMkIsV0FBVyxNQUFNLFFBQVEsQ0FBQyxJQUFJO0FBQUE7QUFHL0QsS0FBSzsiLAogICJkZWJ1Z0lkIjogIjEwODQ0NzcyRjgxNTA4RDc2NDc1NkUyMTY0NzU2RTIxIiwKICAibmFtZXMiOiBbXQp9
