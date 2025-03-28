import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { generateChart } from './chart.js';
export async function renderReport(metrics) {
    const chartsDir = 'charts';
    mkdirSync(chartsDir, { recursive: true });
    const report = ['# Metrics\n'];
    // Success Rate
    const availabilityChart = await generateChart('Success Rate', [metrics.read_availability[0], metrics.write_availability[0]], 'Time, m', '%', ['Read', 'Write']);
    const availabilityPath = join(chartsDir, 'availability.png');
    writeFileSync(availabilityPath, availabilityChart);
    report.push(`## Success Rate\n![Success Rate](${availabilityPath})\n`);
    // Operations Per Second
    const throughputChart = await generateChart('Operations Per Second', [metrics.read_throughput[0], metrics.write_throughput[0]], 'Time, m', 'ops', ['Read', 'Write']);
    const throughputPath = join(chartsDir, 'throughput.png');
    writeFileSync(throughputPath, throughputChart);
    report.push(`## Operations Per Second\n![Operations Per Second](${throughputPath})\n`);
    // 95th Percentile Latency
    const latencyChart = await generateChart('95th Percentile Latency', [metrics.read_latency_ms[0], metrics.write_latency_ms[0]], 'Time, m', 'ms', ['Read', 'Write']);
    const latencyPath = join(chartsDir, 'latency.png');
    writeFileSync(latencyPath, latencyChart);
    report.push(`## 95th Percentile Latency\n![95th Percentile Latency](${latencyPath})\n`);
    return report.join('\n');
}
