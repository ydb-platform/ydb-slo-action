import {
  formatChange,
  formatValue
} from "./analysis.js";
import"./metrics.js";
import {
  require_core
} from "../../main-d15da32k.js";
import"../../main-zqznhazw.js";
import"../../main-c7r720rd.js";
import {
  __toESM
} from "../../main-ynsbc1hx.js";

// report/lib/summary.ts
var import_core = __toESM(require_core(), 1);
async function writeJobSummary(data) {
  import_core.summary.addHeading("\uD83C\uDF0B SLO Test Summary", 1), import_core.summary.addRaw(`
<p>
	<strong>Current:</strong> <a href="${data.commits.current.url}">${data.commits.current.short}</a>
	vs
	<strong>Base:</strong> <a href="${data.commits.base.url}">${data.commits.base.short}</a>
</p>
	`), import_core.summary.addBreak();
  let totalMetrics = data.workloads.reduce((sum, w) => sum + w.summary.total, 0), totalRegressions = data.workloads.reduce((sum, w) => sum + w.summary.regressions, 0), totalImprovements = data.workloads.reduce((sum, w) => sum + w.summary.improvements, 0), totalStable = data.workloads.reduce((sum, w) => sum + w.summary.stable, 0);
  import_core.summary.addRaw(`
<table>
	<tr>
		<td><strong>${data.workloads.length}</strong> workloads</td>
		<td><strong>${totalMetrics}</strong> metrics</td>
		<td><strong style="color: #1a7f37;">${totalImprovements}</strong> improvements</td>
		<td><strong style="color: #cf222e;">${totalRegressions}</strong> regressions</td>
		<td><strong style="color: #6e7781;">${totalStable}</strong> stable</td>
	</tr>
</table>
	`), import_core.summary.addBreak();
  for (let workload of data.workloads) {
    let statusEmoji = workload.summary.regressions > 0 ? "\uD83D\uDFE1" : "\uD83D\uDFE2", artifactUrl = data.artifactUrls?.get(workload.workload);
    if (import_core.summary.addHeading(`${statusEmoji} ${workload.workload}`, 3), artifactUrl)
      import_core.summary.addRaw(`<p><a href="${artifactUrl}">\uD83D\uDCCA View detailed HTML report</a></p>`);
    import_core.summary.addTable([
      [
        { data: "Metric", header: !0 },
        { data: "Current", header: !0 },
        { data: "Base", header: !0 },
        { data: "Change", header: !0 }
      ],
      ...workload.metrics.map((m) => [
        m.name,
        formatValue(m.current.value, m.name),
        m.base.available ? formatValue(m.base.value, m.name) : "N/A",
        m.base.available ? formatChange(m.change.percent, m.change.direction) : "N/A"
      ])
    ]), import_core.summary.addBreak();
  }
  await import_core.summary.write();
}
async function clearJobSummary() {
  import_core.summary.emptyBuffer(), await import_core.summary.write();
}
export {
  writeJobSummary,
  clearJobSummary
};

export { writeJobSummary };

//# debugId=DB9565DEBD886EBC64756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vcmVwb3J0L2xpYi9zdW1tYXJ5LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWwogICAgIi8qKlxuICogR2l0SHViIEFjdGlvbnMgSm9iIFN1bW1hcnkgZ2VuZXJhdGlvblxuICovXG5cbmltcG9ydCB7IHN1bW1hcnkgfSBmcm9tICdAYWN0aW9ucy9jb3JlJ1xuXG5pbXBvcnQgeyBmb3JtYXRDaGFuZ2UsIGZvcm1hdFZhbHVlLCB0eXBlIFdvcmtsb2FkQ29tcGFyaXNvbiB9IGZyb20gJy4vYW5hbHlzaXMuanMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgU3VtbWFyeURhdGEge1xuXHR3b3JrbG9hZHM6IFdvcmtsb2FkQ29tcGFyaXNvbltdXG5cdGNvbW1pdHM6IHtcblx0XHRjdXJyZW50OiB7IHNoYTogc3RyaW5nOyB1cmw6IHN0cmluZzsgc2hvcnQ6IHN0cmluZyB9XG5cdFx0YmFzZTogeyBzaGE6IHN0cmluZzsgdXJsOiBzdHJpbmc7IHNob3J0OiBzdHJpbmcgfVxuXHR9XG5cdGFydGlmYWN0VXJscz86IE1hcDxzdHJpbmcsIHN0cmluZz5cbn1cblxuLyoqXG4gKiBXcml0ZSBKb2IgU3VtbWFyeSB3aXRoIGFsbCB3b3JrbG9hZHNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdyaXRlSm9iU3VtbWFyeShkYXRhOiBTdW1tYXJ5RGF0YSk6IFByb21pc2U8dm9pZD4ge1xuXHRzdW1tYXJ5LmFkZEhlYWRpbmcoJ/CfjIsgU0xPIFRlc3QgU3VtbWFyeScsIDEpXG5cblx0Ly8gQ29tbWl0cyBpbmZvXG5cdHN1bW1hcnkuYWRkUmF3KGBcbjxwPlxuXHQ8c3Ryb25nPkN1cnJlbnQ6PC9zdHJvbmc+IDxhIGhyZWY9XCIke2RhdGEuY29tbWl0cy5jdXJyZW50LnVybH1cIj4ke2RhdGEuY29tbWl0cy5jdXJyZW50LnNob3J0fTwvYT5cblx0dnNcblx0PHN0cm9uZz5CYXNlOjwvc3Ryb25nPiA8YSBocmVmPVwiJHtkYXRhLmNvbW1pdHMuYmFzZS51cmx9XCI+JHtkYXRhLmNvbW1pdHMuYmFzZS5zaG9ydH08L2E+XG48L3A+XG5cdGApXG5cblx0c3VtbWFyeS5hZGRCcmVhaygpXG5cblx0Ly8gT3ZlcmFsbCBzdGF0c1xuXHRsZXQgdG90YWxNZXRyaWNzID0gZGF0YS53b3JrbG9hZHMucmVkdWNlKChzdW0sIHcpID0+IHN1bSArIHcuc3VtbWFyeS50b3RhbCwgMClcblx0bGV0IHRvdGFsUmVncmVzc2lvbnMgPSBkYXRhLndvcmtsb2Fkcy5yZWR1Y2UoKHN1bSwgdykgPT4gc3VtICsgdy5zdW1tYXJ5LnJlZ3Jlc3Npb25zLCAwKVxuXHRsZXQgdG90YWxJbXByb3ZlbWVudHMgPSBkYXRhLndvcmtsb2Fkcy5yZWR1Y2UoKHN1bSwgdykgPT4gc3VtICsgdy5zdW1tYXJ5LmltcHJvdmVtZW50cywgMClcblx0bGV0IHRvdGFsU3RhYmxlID0gZGF0YS53b3JrbG9hZHMucmVkdWNlKChzdW0sIHcpID0+IHN1bSArIHcuc3VtbWFyeS5zdGFibGUsIDApXG5cblx0c3VtbWFyeS5hZGRSYXcoYFxuPHRhYmxlPlxuXHQ8dHI+XG5cdFx0PHRkPjxzdHJvbmc+JHtkYXRhLndvcmtsb2Fkcy5sZW5ndGh9PC9zdHJvbmc+IHdvcmtsb2FkczwvdGQ+XG5cdFx0PHRkPjxzdHJvbmc+JHt0b3RhbE1ldHJpY3N9PC9zdHJvbmc+IG1ldHJpY3M8L3RkPlxuXHRcdDx0ZD48c3Ryb25nIHN0eWxlPVwiY29sb3I6ICMxYTdmMzc7XCI+JHt0b3RhbEltcHJvdmVtZW50c308L3N0cm9uZz4gaW1wcm92ZW1lbnRzPC90ZD5cblx0XHQ8dGQ+PHN0cm9uZyBzdHlsZT1cImNvbG9yOiAjY2YyMjJlO1wiPiR7dG90YWxSZWdyZXNzaW9uc308L3N0cm9uZz4gcmVncmVzc2lvbnM8L3RkPlxuXHRcdDx0ZD48c3Ryb25nIHN0eWxlPVwiY29sb3I6ICM2ZTc3ODE7XCI+JHt0b3RhbFN0YWJsZX08L3N0cm9uZz4gc3RhYmxlPC90ZD5cblx0PC90cj5cbjwvdGFibGU+XG5cdGApXG5cblx0c3VtbWFyeS5hZGRCcmVhaygpXG5cblx0Ly8gRWFjaCB3b3JrbG9hZFxuXHRmb3IgKGxldCB3b3JrbG9hZCBvZiBkYXRhLndvcmtsb2Fkcykge1xuXHRcdGxldCBzdGF0dXNFbW9qaSA9IHdvcmtsb2FkLnN1bW1hcnkucmVncmVzc2lvbnMgPiAwID8gJ/Cfn6EnIDogJ/Cfn6InXG5cdFx0bGV0IGFydGlmYWN0VXJsID0gZGF0YS5hcnRpZmFjdFVybHM/LmdldCh3b3JrbG9hZC53b3JrbG9hZClcblxuXHRcdHN1bW1hcnkuYWRkSGVhZGluZyhgJHtzdGF0dXNFbW9qaX0gJHt3b3JrbG9hZC53b3JrbG9hZH1gLCAzKVxuXG5cdFx0aWYgKGFydGlmYWN0VXJsKSB7XG5cdFx0XHRzdW1tYXJ5LmFkZFJhdyhgPHA+PGEgaHJlZj1cIiR7YXJ0aWZhY3RVcmx9XCI+8J+TiiBWaWV3IGRldGFpbGVkIEhUTUwgcmVwb3J0PC9hPjwvcD5gKVxuXHRcdH1cblxuXHRcdC8vIE1ldHJpY3MgdGFibGVcblx0XHRzdW1tYXJ5LmFkZFRhYmxlKFtcblx0XHRcdFtcblx0XHRcdFx0eyBkYXRhOiAnTWV0cmljJywgaGVhZGVyOiB0cnVlIH0sXG5cdFx0XHRcdHsgZGF0YTogJ0N1cnJlbnQnLCBoZWFkZXI6IHRydWUgfSxcblx0XHRcdFx0eyBkYXRhOiAnQmFzZScsIGhlYWRlcjogdHJ1ZSB9LFxuXHRcdFx0XHR7IGRhdGE6ICdDaGFuZ2UnLCBoZWFkZXI6IHRydWUgfSxcblx0XHRcdF0sXG5cdFx0XHQuLi53b3JrbG9hZC5tZXRyaWNzLm1hcCgobSkgPT4gW1xuXHRcdFx0XHRtLm5hbWUsXG5cdFx0XHRcdGZvcm1hdFZhbHVlKG0uY3VycmVudC52YWx1ZSwgbS5uYW1lKSxcblx0XHRcdFx0bS5iYXNlLmF2YWlsYWJsZSA/IGZvcm1hdFZhbHVlKG0uYmFzZS52YWx1ZSwgbS5uYW1lKSA6ICdOL0EnLFxuXHRcdFx0XHRtLmJhc2UuYXZhaWxhYmxlID8gZm9ybWF0Q2hhbmdlKG0uY2hhbmdlLnBlcmNlbnQsIG0uY2hhbmdlLmRpcmVjdGlvbikgOiAnTi9BJyxcblx0XHRcdF0pLFxuXHRcdF0pXG5cblx0XHRzdW1tYXJ5LmFkZEJyZWFrKClcblx0fVxuXG5cdGF3YWl0IHN1bW1hcnkud3JpdGUoKVxufVxuXG4vKipcbiAqIENsZWFyIGV4aXN0aW5nIHN1bW1hcnlcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNsZWFySm9iU3VtbWFyeSgpOiBQcm9taXNlPHZvaWQ+IHtcblx0c3VtbWFyeS5lbXB0eUJ1ZmZlcigpXG5cdGF3YWl0IHN1bW1hcnkud3JpdGUoKVxufVxuIgogIF0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7O0FBSUE7QUFnQkEsZUFBc0IsZUFBZSxDQUFDLE1BQWtDO0FBQUEsRUFDdkUsb0JBQVEsV0FBVyxpQ0FBc0IsQ0FBQyxHQUcxQyxvQkFBUSxPQUFPO0FBQUE7QUFBQSxzQ0FFc0IsS0FBSyxRQUFRLFFBQVEsUUFBUSxLQUFLLFFBQVEsUUFBUTtBQUFBO0FBQUEsbUNBRXJELEtBQUssUUFBUSxLQUFLLFFBQVEsS0FBSyxRQUFRLEtBQUs7QUFBQTtBQUFBLEVBRTdFLEdBRUQsb0JBQVEsU0FBUztBQUFBLEVBR2pCLElBQUksZUFBZSxLQUFLLFVBQVUsT0FBTyxDQUFDLEtBQUssTUFBTSxNQUFNLEVBQUUsUUFBUSxPQUFPLENBQUMsR0FDekUsbUJBQW1CLEtBQUssVUFBVSxPQUFPLENBQUMsS0FBSyxNQUFNLE1BQU0sRUFBRSxRQUFRLGFBQWEsQ0FBQyxHQUNuRixvQkFBb0IsS0FBSyxVQUFVLE9BQU8sQ0FBQyxLQUFLLE1BQU0sTUFBTSxFQUFFLFFBQVEsY0FBYyxDQUFDLEdBQ3JGLGNBQWMsS0FBSyxVQUFVLE9BQU8sQ0FBQyxLQUFLLE1BQU0sTUFBTSxFQUFFLFFBQVEsUUFBUSxDQUFDO0FBQUEsRUFFN0Usb0JBQVEsT0FBTztBQUFBO0FBQUE7QUFBQSxnQkFHQSxLQUFLLFVBQVU7QUFBQSxnQkFDZjtBQUFBLHdDQUN3QjtBQUFBLHdDQUNBO0FBQUEsd0NBQ0E7QUFBQTtBQUFBO0FBQUEsRUFHdEMsR0FFRCxvQkFBUSxTQUFTO0FBQUEsRUFHakIsU0FBUyxZQUFZLEtBQUssV0FBVztBQUFBLElBQ3BDLElBQUksY0FBYyxTQUFTLFFBQVEsY0FBYyxJQUFJLGlCQUFNLGdCQUN2RCxjQUFjLEtBQUssY0FBYyxJQUFJLFNBQVMsUUFBUTtBQUFBLElBSTFELElBRkEsb0JBQVEsV0FBVyxHQUFHLGVBQWUsU0FBUyxZQUFZLENBQUMsR0FFdkQ7QUFBQSxNQUNILG9CQUFRLE9BQU8sZUFBZSw2REFBa0Q7QUFBQSxJQUlqRixvQkFBUSxTQUFTO0FBQUEsTUFDaEI7QUFBQSxRQUNDLEVBQUUsTUFBTSxVQUFVLFFBQVEsR0FBSztBQUFBLFFBQy9CLEVBQUUsTUFBTSxXQUFXLFFBQVEsR0FBSztBQUFBLFFBQ2hDLEVBQUUsTUFBTSxRQUFRLFFBQVEsR0FBSztBQUFBLFFBQzdCLEVBQUUsTUFBTSxVQUFVLFFBQVEsR0FBSztBQUFBLE1BQ2hDO0FBQUEsTUFDQSxHQUFHLFNBQVMsUUFBUSxJQUFJLENBQUMsTUFBTTtBQUFBLFFBQzlCLEVBQUU7QUFBQSxRQUNGLFlBQVksRUFBRSxRQUFRLE9BQU8sRUFBRSxJQUFJO0FBQUEsUUFDbkMsRUFBRSxLQUFLLFlBQVksWUFBWSxFQUFFLEtBQUssT0FBTyxFQUFFLElBQUksSUFBSTtBQUFBLFFBQ3ZELEVBQUUsS0FBSyxZQUFZLGFBQWEsRUFBRSxPQUFPLFNBQVMsRUFBRSxPQUFPLFNBQVMsSUFBSTtBQUFBLE1BQ3pFLENBQUM7QUFBQSxJQUNGLENBQUMsR0FFRCxvQkFBUSxTQUFTO0FBQUE7QUFBQSxFQUdsQixNQUFNLG9CQUFRLE1BQU07QUFBQTtBQU1yQixlQUFzQixlQUFlLEdBQWtCO0FBQUEsRUFDdEQsb0JBQVEsWUFBWSxHQUNwQixNQUFNLG9CQUFRLE1BQU07QUFBQTsiLAogICJkZWJ1Z0lkIjogIkRCOTU2NURFQkQ4ODZFQkM2NDc1NkUyMTY0NzU2RTIxIiwKICAibmFtZXMiOiBbXQp9
