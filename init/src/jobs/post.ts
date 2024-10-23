import * as fs from 'node:fs'
import { exec } from "@actions/exec"
import { debug, getState, saveState } from "@actions/core"

(async function post() {
	let cwd = getState("CWD")

	let start = new Date(getState("YDB_START_TIME"))
	let end = new Date()

	debug("Stopping YDB...")
	await exec(`docker`, [`compose`, `-f`, `compose.yaml`, `down`], { cwd })

	debug(`YDB stopped at ${end}`)
	saveState("YDB_END_TIME", end.toISOString())

	let duration = end.getTime() - start.getTime()
	debug(`YDB SLO Test duration: ${duration}ms.`)

	debug("Cleaning up temp directory...")
	fs.rmSync(cwd, { recursive: true });
})()
