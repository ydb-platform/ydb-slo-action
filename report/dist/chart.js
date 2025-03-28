import { createCanvas } from 'canvas';
export async function generateChart(options) {
    const { title, xLabel, yLabel, series, seriesLabels } = options;
    const width = 800;
    const height = 400;
    const padding = 50;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    // Очищаем фон
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    // Рисуем заголовок
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, padding / 2);
    // Рисуем оси
    ctx.beginPath();
    ctx.strokeStyle = 'black';
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    // Рисуем подписи осей
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(xLabel, width / 2, height - padding / 2);
    ctx.save();
    ctx.translate(padding / 2, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
    // Находим максимальные значения для масштабирования
    const maxX = Math.max(...series.map((s) => s.length));
    const maxY = Math.max(...series.flat());
    // Рисуем графики
    const colors = ['#2196F3', '#F44336', '#4CAF50', '#FFC107'];
    series.forEach((data, index) => {
        ctx.beginPath();
        ctx.strokeStyle = colors[index % colors.length];
        ctx.lineWidth = 2;
        data.forEach((value, i) => {
            const x = padding + (i / (maxX - 1)) * (width - 2 * padding);
            const y = height - padding - (value / maxY) * (height - 2 * padding);
            if (i === 0) {
                ctx.moveTo(x, y);
            }
            else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
    });
    // Рисуем легенду
    seriesLabels.forEach((label, index) => {
        const x = width - padding + 10;
        const y = padding + index * 20;
        ctx.fillStyle = colors[index % colors.length];
        ctx.fillRect(x, y, 10, 10);
        ctx.fillStyle = 'black';
        ctx.textAlign = 'left';
        ctx.fillText(label, x + 15, y + 10);
    });
    return canvas.toBuffer('image/png');
}
