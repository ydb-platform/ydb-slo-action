import * as fs from 'node:fs'
import * as path from 'node:path'
import { exec } from "@actions/exec"
import { debug, getInput, getState, saveState } from "@actions/core"
import { DefaultArtifactClient } from '@actions/artifact'
import { collectPrometheus } from '../metrics/prometheus'
import { defaultMetrics } from '../metrics/default'
import { renderReport } from '../report/default'

(async function post() {
	let cwd = getState("CWD")

	let end = new Date()
	let start = new Date(getState("YDB_START_TIME"))
	saveState("YDB_END_TIME", end.toISOString())

	debug("Collecting metrics...")
	let metrics = await collectPrometheus(start, end, defaultMetrics.metrics)
	debug(`Metrics: ${Object.keys(metrics)}`)

	debug("Rendering report...")
	let report = renderReport(getInput("sdk_name") || "Unknown", metrics)
	debug(`Report: ${report}`)

	debug("Writing report...")
	let reportPath = path.join(cwd, "/report.md")
	fs.writeFileSync(path.join(cwd, "/report.md"), report, { encoding: "utf-8" })
	debug(`Report written to ${reportPath}`)

	{
		debug("Upload report as an artifact...")
		let artifactClient = new DefaultArtifactClient()
		let { id } = await artifactClient.uploadArtifact("report.md", [reportPath], cwd, { retentionDays: 1 })
		debug(`Report uploaded as an artifact ${id}`)
	}

	debug("Stopping YDB...")
	await exec(`docker`, [`compose`, `-f`, `compose.yaml`, `down`], { cwd })

	debug(`YDB stopped at ${end}`)

	let duration = end.getTime() - start.getTime()
	debug(`YDB SLO Test duration: ${duration}ms.`)

	debug("Cleaning up temp directory...")
	fs.rmSync(cwd, { recursive: true });
})()
