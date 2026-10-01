import { readFile, writeFile } from 'node:fs/promises'

import { generateHTMLReport } from '../../report/lib/html.js'
import { analyzeSloWorkload } from '../../shared/slo-analysis.js'
import type { CollectedMetric } from '../../shared/metrics.js'
import type { TestMetadata } from '../../shared/metadata.js'

let input: { meta: TestMetadata; metrics: CollectedMetric[] } = JSON.parse(
	await readFile('.slo-topic-graph-data.json', 'utf8')
)
let analysis = analyzeSloWorkload(
	input.meta.workload, input.metrics, 'current', 'baseline', { sloVerdict: input.meta.slo?.verdict }
)
let html = await generateHTMLReport(input.meta, [], analysis, input.metrics)
await writeFile('.slo-topic-report.html', html)
console.log(`Rendered ${analysis.metrics.length} native SDK metric cards`)
