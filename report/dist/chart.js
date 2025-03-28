import { createCanvas } from 'canvas';
const WIDTH = 1200;
const HEIGHT = 400;
const PADDING = 40;
const COLORS = {
    read: '#1F77B4',
    write: '#FF7F0E'
};
function drawGrid(ctx, width, height) {
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    // Вертикальные линии
    for (let x = PADDING; x < width - PADDING; x += 100) {
        ctx.beginPath();
        ctx.moveTo(x, PADDING);
        ctx.lineTo(x, height - PADDING);
        ctx.stroke();
    }
    // Горизонтальные линии
    for (let y = PADDING; y < height - PADDING; y += 50) {
        ctx.beginPath();
        ctx.moveTo(PADDING, y);
        ctx.lineTo(width - PADDING, y);
        ctx.stroke();
    }
}
function drawAxis(ctx, width, height, xLabel, yLabel) {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#000';
    ctx.font = '14px Arial';
    // X axis
    ctx.beginPath();
    ctx.moveTo(PADDING, height - PADDING);
    ctx.lineTo(width - PADDING, height - PADDING);
    ctx.stroke();
    ctx.fillText(xLabel, width - PADDING - 50, height - 10);
    // Y axis
    ctx.beginPath();
    ctx.moveTo(PADDING, PADDING);
    ctx.lineTo(PADDING, height - PADDING);
    ctx.stroke();
    ctx.save();
    ctx.translate(20, height - PADDING - 50);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
}
function drawLine(ctx, values, color, width, height, min, max) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const xStep = (width - 2 * PADDING) / (values.length - 1);
    const yScale = (height - 2 * PADDING) / (max - min);
    values.forEach((value, i) => {
        const x = PADDING + i * xStep;
        const y = height - PADDING - (value - min) * yScale;
        if (i === 0) {
            ctx.moveTo(x, y);
        }
        else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
}
function drawLegend(ctx, width, height) {
    ctx.font = '14px Arial';
    ctx.fillStyle = '#000';
    const legendX = width - PADDING - 150;
    const legendY = PADDING + 30;
    // Read legend
    ctx.fillStyle = COLORS.read;
    ctx.fillRect(legendX, legendY, 20, 2);
    ctx.fillStyle = '#000';
    ctx.fillText('read', legendX + 30, legendY + 10);
    // Write legend
    ctx.fillStyle = COLORS.write;
    ctx.fillRect(legendX, legendY + 20, 20, 2);
    ctx.fillStyle = '#000';
    ctx.fillText('write', legendX + 30, legendY + 30);
}
export async function generateChart(title, series, xLabel, yLabel) {
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');
    // Clear background
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    // Draw title
    ctx.fillStyle = '#000';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, WIDTH / 2, 30);
    // Calculate min/max for y-axis
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const s of series) {
        for (const [, value] of s.values) {
            const v = parseFloat(value);
            if (v < min)
                min = v;
            if (v > max)
                max = v;
        }
    }
    // Add some padding to min/max
    const range = max - min;
    min -= range * 0.1;
    max += range * 0.1;
    // Draw chart elements
    drawGrid(ctx, WIDTH, HEIGHT);
    drawAxis(ctx, WIDTH, HEIGHT, xLabel, yLabel);
    drawLegend(ctx, WIDTH, HEIGHT);
    // Draw data lines
    series.forEach((s, i) => {
        const values = s.values.map(([, v]) => parseFloat(v));
        drawLine(ctx, values, i === 0 ? COLORS.read : COLORS.write, WIDTH, HEIGHT, min, max);
    });
    return canvas.toBuffer('image/png');
}
