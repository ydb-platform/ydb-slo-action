import { palette as defaultPalette } from "./colors";

export type Series = {
	"metric": Record<string, string>,
	"values": [number, string][] // [timestamp (sec), value (float)]
}

export function renderChart(title: string, series: Series[], xAx = "", yAx = "", palette = defaultPalette): string {
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
			let v = Math.round(parseFloat(value) * 1000) / 1000;
			if (isNaN(v)) {
				v = 0;
			}

			line.push(v);

			if (v < min) min = v;
			if (v > max) max = v;
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
    x-axis "${xAx}" 0 --> 10
    y-axis "${yAx}" ${Math.floor(min * 0.9)} --> ${Math.floor(max * 1.1)}
    ${lines.join("\n    ")}
\`\`\`
`
}
