import {
  require_core
} from "../../main-d4h7eace.js";
import {
  require_exec
} from "../../main-c7r720rd.js";
import {
  __toESM
} from "../../main-ynsbc1hx.js";

// init/lib/docker.ts
var import_core = __toESM(require_core(), 1), import_exec = __toESM(require_exec(), 1);
async function getContainerIp(containerName, cwd) {
  try {
    let chunks = [];
    return await import_exec.exec("docker", ["inspect", "-f", "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}", containerName], {
      cwd,
      silent: !0,
      listeners: {
        stdout: (data) => chunks.push(data.toString())
      }
    }), chunks.join("").trim() || null;
  } catch (error) {
    return import_core.warning(`Failed to get container IP for ${containerName}: ${String(error)}`), null;
  }
}
async function collectComposeLogs(cwd) {
  try {
    let chunks = [];
    return await import_exec.exec("docker", ["compose", "-f", "compose.yml", "logs", "--no-color"], {
      cwd,
      silent: !0,
      listeners: {
        stdout: (data) => chunks.push(data.toString()),
        stderr: (data) => chunks.push(data.toString())
      }
    }), chunks.join("");
  } catch (error) {
    return import_core.warning(`Failed to collect docker compose logs: ${String(error)}`), "";
  }
}
async function collectDockerEvents(options) {
  let events = [];
  try {
    let chunks = [];
    await import_exec.exec("docker", [
      "events",
      "--filter",
      "label=ydb.node.type=database",
      "--filter",
      "event=stop",
      "--filter",
      "event=start",
      "--filter",
      "event=kill",
      "--filter",
      "event=restart",
      "--since",
      options.since.toISOString(),
      "--until",
      options.until.toISOString(),
      "--format",
      "{{json .}}"
    ], {
      cwd: options.cwd,
      silent: !0,
      listeners: {
        stdout: (data) => chunks.push(data.toString())
      }
    });
    let lines = chunks.join("").split(`
`).filter(Boolean);
    for (let line of lines)
      events.push(JSON.parse(line));
  } catch (error) {
    import_core.warning(`Failed to collect Docker events: ${String(error)}`);
  }
  return events;
}
async function stopCompose(cwd) {
  await import_exec.exec("docker", ["compose", "-f", "compose.yml", "down"], { cwd });
}
export {
  stopCompose,
  getContainerIp,
  collectDockerEvents,
  collectComposeLogs
};

export { getContainerIp, collectComposeLogs, collectDockerEvents, stopCompose };

//# debugId=4F4E13C34AFAA67864756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vaW5pdC9saWIvZG9ja2VyLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWwogICAgImltcG9ydCB7IHdhcm5pbmcgfSBmcm9tICdAYWN0aW9ucy9jb3JlJ1xuaW1wb3J0IHsgZXhlYyB9IGZyb20gJ0BhY3Rpb25zL2V4ZWMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgRG9ja2VyRXZlbnQge1xuXHRzdGF0dXM6IHN0cmluZ1xuXHRpZDogc3RyaW5nXG5cdGZyb206IHN0cmluZ1xuXHRUeXBlOiBzdHJpbmdcblx0QWN0aW9uOiBzdHJpbmdcblx0QWN0b3I6IHtcblx0XHRJRDogc3RyaW5nXG5cdFx0QXR0cmlidXRlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuXHR9XG5cdHNjb3BlOiBzdHJpbmdcblx0dGltZTogbnVtYmVyXG5cdHRpbWVOYW5vOiBudW1iZXJcbn1cblxuLyoqXG4gKiBHZXRzIElQIGFkZHJlc3Mgb2YgYSBEb2NrZXIgY29udGFpbmVyXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRDb250YWluZXJJcChjb250YWluZXJOYW1lOiBzdHJpbmcsIGN3ZDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG5cdHRyeSB7XG5cdFx0bGV0IGNodW5rczogc3RyaW5nW10gPSBbXVxuXG5cdFx0YXdhaXQgZXhlYyhcblx0XHRcdCdkb2NrZXInLFxuXHRcdFx0WydpbnNwZWN0JywgJy1mJywgJ3t7cmFuZ2UgLk5ldHdvcmtTZXR0aW5ncy5OZXR3b3Jrc319e3suSVBBZGRyZXNzfX17e2VuZH19JywgY29udGFpbmVyTmFtZV0sXG5cdFx0XHR7XG5cdFx0XHRcdGN3ZCxcblx0XHRcdFx0c2lsZW50OiB0cnVlLFxuXHRcdFx0XHRsaXN0ZW5lcnM6IHtcblx0XHRcdFx0XHRzdGRvdXQ6IChkYXRhKSA9PiBjaHVua3MucHVzaChkYXRhLnRvU3RyaW5nKCkpLFxuXHRcdFx0XHR9LFxuXHRcdFx0fVxuXHRcdClcblxuXHRcdGxldCBpcCA9IGNodW5rcy5qb2luKCcnKS50cmltKClcblx0XHRyZXR1cm4gaXAgfHwgbnVsbFxuXHR9IGNhdGNoIChlcnJvcikge1xuXHRcdHdhcm5pbmcoYEZhaWxlZCB0byBnZXQgY29udGFpbmVyIElQIGZvciAke2NvbnRhaW5lck5hbWV9OiAke1N0cmluZyhlcnJvcil9YClcblx0XHRyZXR1cm4gbnVsbFxuXHR9XG59XG5cbi8qKlxuICogQ29sbGVjdHMgbG9ncyBmcm9tIERvY2tlciBDb21wb3NlIHNlcnZpY2VzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjb2xsZWN0Q29tcG9zZUxvZ3MoY3dkOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuXHR0cnkge1xuXHRcdGxldCBjaHVua3M6IHN0cmluZ1tdID0gW11cblxuXHRcdGF3YWl0IGV4ZWMoYGRvY2tlcmAsIFtgY29tcG9zZWAsIGAtZmAsIGBjb21wb3NlLnltbGAsIGBsb2dzYCwgYC0tbm8tY29sb3JgXSwge1xuXHRcdFx0Y3dkLFxuXHRcdFx0c2lsZW50OiB0cnVlLFxuXHRcdFx0bGlzdGVuZXJzOiB7XG5cdFx0XHRcdHN0ZG91dDogKGRhdGEpID0+IGNodW5rcy5wdXNoKGRhdGEudG9TdHJpbmcoKSksXG5cdFx0XHRcdHN0ZGVycjogKGRhdGEpID0+IGNodW5rcy5wdXNoKGRhdGEudG9TdHJpbmcoKSksXG5cdFx0XHR9LFxuXHRcdH0pXG5cblx0XHRyZXR1cm4gY2h1bmtzLmpvaW4oJycpXG5cdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0d2FybmluZyhgRmFpbGVkIHRvIGNvbGxlY3QgZG9ja2VyIGNvbXBvc2UgbG9nczogJHtTdHJpbmcoZXJyb3IpfWApXG5cdFx0cmV0dXJuICcnXG5cdH1cbn1cblxuLyoqXG4gKiBDb2xsZWN0cyBEb2NrZXIgZXZlbnRzIGZvciBZREIgZGF0YWJhc2Ugbm9kZXNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvbGxlY3REb2NrZXJFdmVudHMob3B0aW9uczogeyBjd2Q6IHN0cmluZzsgc2luY2U6IERhdGU7IHVudGlsOiBEYXRlIH0pOiBQcm9taXNlPERvY2tlckV2ZW50W10+IHtcblx0bGV0IGV2ZW50czogRG9ja2VyRXZlbnRbXSA9IFtdXG5cblx0dHJ5IHtcblx0XHRsZXQgY2h1bmtzOiBzdHJpbmdbXSA9IFtdXG5cblx0XHRhd2FpdCBleGVjKFxuXHRcdFx0YGRvY2tlcmAsXG5cdFx0XHRbXG5cdFx0XHRcdGBldmVudHNgLFxuXHRcdFx0XHRgLS1maWx0ZXJgLFxuXHRcdFx0XHRgbGFiZWw9eWRiLm5vZGUudHlwZT1kYXRhYmFzZWAsXG5cdFx0XHRcdGAtLWZpbHRlcmAsXG5cdFx0XHRcdGBldmVudD1zdG9wYCxcblx0XHRcdFx0YC0tZmlsdGVyYCxcblx0XHRcdFx0YGV2ZW50PXN0YXJ0YCxcblx0XHRcdFx0YC0tZmlsdGVyYCxcblx0XHRcdFx0YGV2ZW50PWtpbGxgLFxuXHRcdFx0XHRgLS1maWx0ZXJgLFxuXHRcdFx0XHRgZXZlbnQ9cmVzdGFydGAsXG5cdFx0XHRcdGAtLXNpbmNlYCxcblx0XHRcdFx0b3B0aW9ucy5zaW5jZS50b0lTT1N0cmluZygpLFxuXHRcdFx0XHRgLS11bnRpbGAsXG5cdFx0XHRcdG9wdGlvbnMudW50aWwudG9JU09TdHJpbmcoKSxcblx0XHRcdFx0YC0tZm9ybWF0YCxcblx0XHRcdFx0YHt7anNvbiAufX1gLFxuXHRcdFx0XSxcblx0XHRcdHtcblx0XHRcdFx0Y3dkOiBvcHRpb25zLmN3ZCxcblx0XHRcdFx0c2lsZW50OiB0cnVlLFxuXHRcdFx0XHRsaXN0ZW5lcnM6IHtcblx0XHRcdFx0XHRzdGRvdXQ6IChkYXRhKSA9PiBjaHVua3MucHVzaChkYXRhLnRvU3RyaW5nKCkpLFxuXHRcdFx0XHR9LFxuXHRcdFx0fVxuXHRcdClcblxuXHRcdGxldCBsaW5lcyA9IGNodW5rcy5qb2luKCcnKS5zcGxpdCgnXFxuJykuZmlsdGVyKEJvb2xlYW4pXG5cdFx0Zm9yIChsZXQgbGluZSBvZiBsaW5lcykge1xuXHRcdFx0ZXZlbnRzLnB1c2goSlNPTi5wYXJzZShsaW5lKSBhcyBEb2NrZXJFdmVudClcblx0XHR9XG5cdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0d2FybmluZyhgRmFpbGVkIHRvIGNvbGxlY3QgRG9ja2VyIGV2ZW50czogJHtTdHJpbmcoZXJyb3IpfWApXG5cdH1cblxuXHRyZXR1cm4gZXZlbnRzXG59XG5cbi8qKlxuICogU3RvcHMgRG9ja2VyIENvbXBvc2UgcHJvamVjdFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3RvcENvbXBvc2UoY3dkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcblx0YXdhaXQgZXhlYyhgZG9ja2VyYCwgW2Bjb21wb3NlYCwgYC1mYCwgYGNvbXBvc2UueW1sYCwgYGRvd25gXSwgeyBjd2QgfSlcbn1cbiIKICBdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7O0FBQUEsOENBQ0E7QUFvQkEsZUFBc0IsY0FBYyxDQUFDLGVBQXVCLEtBQXFDO0FBQUEsRUFDaEcsSUFBSTtBQUFBLElBQ0gsSUFBSSxTQUFtQixDQUFDO0FBQUEsSUFleEIsT0FiQSxNQUFNLGlCQUNMLFVBQ0EsQ0FBQyxXQUFXLE1BQU0sNERBQTRELGFBQWEsR0FDM0Y7QUFBQSxNQUNDO0FBQUEsTUFDQSxRQUFRO0FBQUEsTUFDUixXQUFXO0FBQUEsUUFDVixRQUFRLENBQUMsU0FBUyxPQUFPLEtBQUssS0FBSyxTQUFTLENBQUM7QUFBQSxNQUM5QztBQUFBLElBQ0QsQ0FDRCxHQUVTLE9BQU8sS0FBSyxFQUFFLEVBQUUsS0FBSyxLQUNqQjtBQUFBLElBQ1osT0FBTyxPQUFPO0FBQUEsSUFFZixPQURBLG9CQUFRLGtDQUFrQyxrQkFBa0IsT0FBTyxLQUFLLEdBQUcsR0FDcEU7QUFBQTtBQUFBO0FBT1QsZUFBc0Isa0JBQWtCLENBQUMsS0FBOEI7QUFBQSxFQUN0RSxJQUFJO0FBQUEsSUFDSCxJQUFJLFNBQW1CLENBQUM7QUFBQSxJQVd4QixPQVRBLE1BQU0saUJBQUssVUFBVSxDQUFDLFdBQVcsTUFBTSxlQUFlLFFBQVEsWUFBWSxHQUFHO0FBQUEsTUFDNUU7QUFBQSxNQUNBLFFBQVE7QUFBQSxNQUNSLFdBQVc7QUFBQSxRQUNWLFFBQVEsQ0FBQyxTQUFTLE9BQU8sS0FBSyxLQUFLLFNBQVMsQ0FBQztBQUFBLFFBQzdDLFFBQVEsQ0FBQyxTQUFTLE9BQU8sS0FBSyxLQUFLLFNBQVMsQ0FBQztBQUFBLE1BQzlDO0FBQUEsSUFDRCxDQUFDLEdBRU0sT0FBTyxLQUFLLEVBQUU7QUFBQSxJQUNwQixPQUFPLE9BQU87QUFBQSxJQUVmLE9BREEsb0JBQVEsMENBQTBDLE9BQU8sS0FBSyxHQUFHLEdBQzFEO0FBQUE7QUFBQTtBQU9ULGVBQXNCLG1CQUFtQixDQUFDLFNBQTRFO0FBQUEsRUFDckgsSUFBSSxTQUF3QixDQUFDO0FBQUEsRUFFN0IsSUFBSTtBQUFBLElBQ0gsSUFBSSxTQUFtQixDQUFDO0FBQUEsSUFFeEIsTUFBTSxpQkFDTCxVQUNBO0FBQUEsTUFDQztBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQSxRQUFRLE1BQU0sWUFBWTtBQUFBLE1BQzFCO0FBQUEsTUFDQSxRQUFRLE1BQU0sWUFBWTtBQUFBLE1BQzFCO0FBQUEsTUFDQTtBQUFBLElBQ0QsR0FDQTtBQUFBLE1BQ0MsS0FBSyxRQUFRO0FBQUEsTUFDYixRQUFRO0FBQUEsTUFDUixXQUFXO0FBQUEsUUFDVixRQUFRLENBQUMsU0FBUyxPQUFPLEtBQUssS0FBSyxTQUFTLENBQUM7QUFBQSxNQUM5QztBQUFBLElBQ0QsQ0FDRDtBQUFBLElBRUEsSUFBSSxRQUFRLE9BQU8sS0FBSyxFQUFFLEVBQUUsTUFBTTtBQUFBLENBQUksRUFBRSxPQUFPLE9BQU87QUFBQSxJQUN0RCxTQUFTLFFBQVE7QUFBQSxNQUNoQixPQUFPLEtBQUssS0FBSyxNQUFNLElBQUksQ0FBZ0I7QUFBQSxJQUUzQyxPQUFPLE9BQU87QUFBQSxJQUNmLG9CQUFRLG9DQUFvQyxPQUFPLEtBQUssR0FBRztBQUFBO0FBQUEsRUFHNUQsT0FBTztBQUFBO0FBTVIsZUFBc0IsV0FBVyxDQUFDLEtBQTRCO0FBQUEsRUFDN0QsTUFBTSxpQkFBSyxVQUFVLENBQUMsV0FBVyxNQUFNLGVBQWUsTUFBTSxHQUFHLEVBQUUsSUFBSSxDQUFDO0FBQUE7IiwKICAiZGVidWdJZCI6ICI0RjRFMTNDMzRBRkFBNjc4NjQ3NTZFMjE2NDc1NkUyMSIsCiAgIm5hbWVzIjogW10KfQ==
