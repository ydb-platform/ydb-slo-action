import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import { info } from '@actions/core'

export const EXTRA_ARTIFACTS_DIR = 'extra'

export function extraArtifactsPath(cwd: string): string {
	return path.join(cwd, EXTRA_ARTIFACTS_DIR)
}

async function walkFiles(dir: string): Promise<string[]> {
	let entries = await fs.readdir(dir, { withFileTypes: true })
	let files: string[] = []

	for (let entry of entries) {
		let fullPath = path.join(dir, entry.name)

		if (entry.isDirectory()) {
			files.push(...(await walkFiles(fullPath)))
		} else if (entry.isFile()) {
			files.push(fullPath)
		}
	}

	return files
}

/**
 * Collects user-provided files from `.slo/extra/` (including subdirectories).
 * Workflow steps may write arbitrary artifacts there after workloads finish
 * and before the init action post phase uploads the job artifact bundle.
 */
export async function collectExtraArtifacts(cwd: string): Promise<string[]> {
	let extraDir = extraArtifactsPath(cwd)

	try {
		await fs.access(extraDir)
	} catch {
		return []
	}

	let files = await walkFiles(extraDir)

	if (files.length > 0) {
		info(`Found ${files.length} extra artifact file(s) in ${extraDir}`)
	}

	return files
}
