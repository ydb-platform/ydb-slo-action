import { renderChart, type Series } from "./chart";

export const renderReport = (sdk: string, metrics: Record<string, Series[]>) => `# SLO Testing <img align="right" height="36" src="https://img.shields.io/badge/⎇-head-%23FF7F0E?style=for-the-badge"><img align="right" height="36"  src="https://img.shields.io/badge/⎇-base-%231F77B4?style=for-the-badge"><img align="right" height="36" src="https://img.shields.io/badge/sdk-${sdk.replace(/-/g, "--")}-%23E377C2?style=for-the-badge">
<details><summary>Operation Success Rate</summary>
${renderChart("operation_type=read", metrics["read_availability"])}
${renderChart("operation_type=write", metrics["write_availability"])}
</details>

<details><summary>Operations Per Second</summary>
${renderChart("operation_type=read", metrics["read_throughput"])}
${renderChart("operation_type=write", metrics["write_throughput"])}
</details>

<details><summary>95th Percentile Latency</summary>
${renderChart("operation_type=read", metrics["read_latency_ms"])}
${renderChart("operation_type=write", metrics["write_latency_ms"])}
</details>
`
