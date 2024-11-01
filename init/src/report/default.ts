import { renderChart, type Series } from "./chart";

export const renderReport = (sdk: string, metrics: Record<string, Series[]>) => `# SLO Report <img align="right" height="36" src="https://img.shields.io/badge/⎇-head-%23FF7F0E?style=for-the-badge"><img align="right" height="36"  src="https://img.shields.io/badge/⎇-base-%231F77B4?style=for-the-badge"><img align="right" height="36" src="https://img.shields.io/badge/sdk-${sdk.replace(/-/g, "--")}-%23E377C2?style=for-the-badge">

### Operation Success Rate

${renderChart("operation_type=read", metrics["read_availability"], "Time, m", "Success Rate, %")}

${renderChart("operation_type=write", metrics["write_availability"], "	Time, m", "Success Rate, %")}

### Operations Per Second

${renderChart("operation_type=read", metrics["read_throughput"], "Time, m", "Operations")}

${renderChart("operation_type=write", metrics["write_throughput"], "Time, m", "Operations")}

### 95th Percentile Latency

${renderChart("operation_type=read", metrics["read_latency_ms"], "Time, m", "Latency, ms")}

${renderChart("operation_type=write", metrics["write_latency_ms"], "Time, m", "Latency, ms")}
`
