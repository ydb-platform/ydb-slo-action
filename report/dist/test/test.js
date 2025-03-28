import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { renderReport } from '../src/report.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
async function main() {
    const metrics = JSON.parse(readFileSync(join(__dirname, 'metrics.json'), 'utf-8'));
    const report = await renderReport(metrics);
    console.log(report);
}
main().catch(console.error);
