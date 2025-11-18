import * as fs from 'node:fs'

import { DefaultArtifactClient } from '@actions/artifact'
import { info, warning } from '@actions/core'

export interface ArtifactFile {
	name: string
	path: string
}

/**
 * Uploads artifacts to GitHub Actions as a single bundle
 */
export async function uploadArtifacts(name: string, artifacts: ArtifactFile[], cwd?: string): Promise<void> {
	let artifactClient = new DefaultArtifactClient()
	let rootDirectory = cwd || process.cwd()

	let files: string[] = []

	for (let artifact of artifacts) {
		if (!fs.existsSync(artifact.path)) {
			warning(`Artifact source missing: ${artifact.path}`)
			continue
		}
		files.push(artifact.path)
	}

	if (files.length === 0) {
		warning('No artifacts to upload')
		return
	}

	try {
		// Keep artifacts for 1 day only to save storage space
		let { id } = await artifactClient.uploadArtifact(name, files, rootDirectory, {
			retentionDays: 1,
		})

		info(`Uploaded ${files.length} file(s) as artifact ${name} (id: ${id})`)
	} catch (error) {
		warning(`Failed to upload artifacts: ${String(error)}`)
	}
}
