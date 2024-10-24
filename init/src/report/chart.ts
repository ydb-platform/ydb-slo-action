import { palette as defaultPalette } from "./colors";

export type Series = {
	"metric": Record<string, string>,
	"values": [number, string][] // [timestamp (sec), value (float)]
}

export function renderChart(title: string, series: Series[], xLabel = "", yLabel = "", palette = defaultPalette): string {
	// 1. Filter zeros
	let minLength = Number.POSITIVE_INFINITY;
	for (const s of series) {
		s.values = s.values.filter(v => v[1] != '0');
		if (s.values.length < minLength) minLength = s.values.length;
	}

	// 2. Limit values (count)
	for (const s of series) {
		// Skip first values then adjusting
		s.values = s.values.slice(-1 * minLength);
	}

	let min = Number.POSITIVE_INFINITY;
	let max = Number.NEGATIVE_INFINITY;

	let lines: string[] = [];
	for (const s of series) {
		let line: number[] = []

		for (let [, value] of s.values) {
			let v = parseFloat(value)
			if (isNaN(v)) {
				v = 0;
			}

			let vR = Math.round(v * 1000) / 1000;
			let vF = Math.floor(v * 1000) / 1000;
			let vC = Math.ceil(v * 1000) / 1000;

			line.push(vR);

			if (vF < min) min = vF;
			if (vC > max) max = vC;
		}

		lines.push(`line [${line.join()}]`);
	}

	return `\`\`\`mermaid
---
config:
    xyChart:
        width: 1200
        height: 400
    themeVariables:
        xyChart:
            titleColor: "#222"
            backgroundColor: "#fff"
            xAxisLineColor: "#222"
            yAxisLineColor: "#222"
            plotColorPalette: "${palette.join()}"
---
xychart-beta
    title "${title}"
    x-axis "${xLabel}" 0 --> 10
    y-axis "${yLabel}" ${Math.floor(min * 0.9)} --> ${Math.ceil(max * 1.1)}
    ${lines.join("\n    ")}
\`\`\`
`
}
