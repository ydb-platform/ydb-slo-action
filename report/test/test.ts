import { readFileSync } from 'node:fs'
import { renderReport } from '../src/report.js'
import type { Metrics } from '../src/metrics.js'

async function main() {
	const metricsData: Metrics = JSON.parse(readFileSync('test/metrics.json', 'utf-8'))
	const report = await renderReport(metricsData)
	console.log(report)
}

main().catch((error) => {
	console.error('Error:', error)
	process.exit(1)
})
