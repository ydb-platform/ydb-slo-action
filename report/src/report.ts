import { renderChart } from './chart'
import type { Metrics } from './metrics'

export const renderReport = (variant: string, metrics: Metrics) => `🌋 Here are results of SLO test for ${variant}:

### Operation Success Rate

${renderChart(`workload=${variant}, operation_type=read`, metrics['read_availability'], 'Time, m', 'Success Rate, %')}

${renderChart(`workload=${variant}, operation_type=write`, metrics['write_availability'], '	Time, m', 'Success Rate, %')}

### Operations Per Second

${renderChart(`workload=${variant}, operation_type=read`, metrics['read_throughput'], 'Time, m', 'Operations')}

${renderChart(`workload=${variant}, operation_type=write`, metrics['write_throughput'], 'Time, m', 'Operations')}

### 95th Percentile Latency

${renderChart(`workload=${variant}, operation_type=read`, metrics['read_latency_ms'], 'Time, m', 'Latency, ms')}

${renderChart(`workload=${variant}, operation_type=write`, metrics['write_latency_ms'], 'Time, m', 'Latency, ms')}
`
