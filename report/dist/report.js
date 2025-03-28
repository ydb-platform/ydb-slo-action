import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { generateChart } from './chart.js';
function extractValues(series) {
    if (!series || series.length === 0)
        return [];
    return series[0].values.map(([_, value]) => parseFloat(value));
}
export async function renderReport(metrics) {
    const chartsDir = 'charts';
    mkdirSync(chartsDir, { recursive: true });
    const report = ['# Metrics\n'];
    // Success Rate
    const availabilityChart = await generateChart({
        title: 'Success Rate',
        xLabel: 'Time, m',
        yLabel: '%',
        series: [
            extractValues(metrics.read_availability),
            extractValues(metrics.write_availability)
        ],
        seriesLabels: ['Read', 'Write']
    });
    const availabilityPath = join(chartsDir, 'availability.png');
    writeFileSync(availabilityPath, availabilityChart);
    report.push(`## Success Rate\n![Success Rate](${availabilityPath})\n`);
    // Operations Per Second
    const throughputChart = await generateChart({
        title: 'Operations Per Second',
        xLabel: 'Time, m',
        yLabel: 'ops',
        series: [
            extractValues(metrics.read_throughput),
            extractValues(metrics.write_throughput)
        ],
        seriesLabels: ['Read', 'Write']
    });
    const throughputPath = join(chartsDir, 'throughput.png');
    writeFileSync(throughputPath, throughputChart);
    report.push(`## Operations Per Second\n![Operations Per Second](${throughputPath})\n`);
    // 95th Percentile Latency
    const latencyChart = await generateChart({
        title: '95th Percentile Latency',
        xLabel: 'Time, m',
        yLabel: 'ms',
        series: [
            extractValues(metrics.read_latency_ms),
            extractValues(metrics.write_latency_ms)
        ],
        seriesLabels: ['Read', 'Write']
    });
    const latencyPath = join(chartsDir, 'latency.png');
    writeFileSync(latencyPath, latencyChart);
    report.push(`## 95th Percentile Latency\n![95th Percentile Latency](${latencyPath})\n`);
    return report.join('\n');
}
