import { generateChart } from './chart';
import { uploadToFileIO } from './upload';
export async function renderReport(variant, metrics) {
    const successRateChart = await generateChart('Success Rate', [metrics['read_availability'][0], metrics['write_availability'][0]], 'Time, m', 'Success Rate, %');
    const successRateUrl = await uploadToFileIO(successRateChart);
    const throughputChart = await generateChart('Operations Per Second', [metrics['read_throughput'][0], metrics['write_throughput'][0]], 'Time, m', 'Operations');
    const throughputUrl = await uploadToFileIO(throughputChart);
    const latencyChart = await generateChart('95th Percentile Latency', [metrics['read_latency_ms'][0], metrics['write_latency_ms'][0]], 'Time, m', 'Latency, ms');
    const latencyUrl = await uploadToFileIO(latencyChart);
    return `🌋 Here are results of SLO test for ${variant}:

### Success Rate
![Success Rate](${successRateUrl})

### Operations Per Second
![Operations Per Second](${throughputUrl})

### 95th Percentile Latency
![Latency](${latencyUrl})`;
}
