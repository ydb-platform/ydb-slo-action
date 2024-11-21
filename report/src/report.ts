import { renderChart } from './chart'
import type { Metrics } from './metrics'

export const renderReport = (variant: string, metrics: Metrics) => `🌋 Here are results of SLO test for ${variant}:

### Operation Success Rate

${renderChart('operation_type=read', metrics['read_availability'], 'Time, m', 'Success Rate, %')}

${renderChart('operation_type=write', metrics['write_availability'], '	Time, m', 'Success Rate, %')}

### Operations Per Second

${renderChart('operation_type=read', metrics['read_throughput'], 'Time, m', 'Operations')}

${renderChart('operation_type=write', metrics['write_throughput'], 'Time, m', 'Operations')}

### 95th Percentile Latency

${renderChart('operation_type=read', metrics['read_latency_ms'], 'Time, m', 'Latency, ms')}

${renderChart('operation_type=write', metrics['write_latency_ms'], 'Time, m', 'Latency, ms')}
`
