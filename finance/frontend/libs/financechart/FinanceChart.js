class FinanceChart {
    constructor(container) {
        this.container = container;
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d");
        this.container.appendChild(this.canvas);

        window.addEventListener("resize", () => this.resize());

        this.init();

        this.data = [];

        return this;
    }

    resize() {
        this.canvas.width = this.container.offsetWidth;
        this.canvas.height = this.container.offsetHeight;
    }

    setData(data) {
        this.data = data;
        return this;
    }

    frame() {
        this.resize();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const data = this.data;
        if (!data || data.length === 0) return;

        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Separate paddings
        const paddingLeft = 50;
        const paddingRight = 50;
        const paddingTop = 25;
        const paddingBottom = 40; // enough for date + time labels

        const chartWidth = width - paddingLeft - paddingRight;
        const chartHeight = height - paddingTop - paddingBottom;

        // Find min and max prices
        let minPrice = Infinity;
        let maxPrice = -Infinity;
        data.forEach(d => {
            minPrice = Math.min(minPrice, d.low);
            maxPrice = Math.max(maxPrice, d.high);
        });

        // Y mapping: higher prices go up
        const scaleY = price => paddingTop + chartHeight - ((price - minPrice) / (maxPrice - minPrice)) * chartHeight;

        const candleWidth = chartWidth / data.length * 0.6;
        const spacing = chartWidth / data.length;

        // Draw candles
        data.forEach((d, i) => {
            const x = paddingLeft + i * spacing + spacing / 2;

            const yOpen = scaleY(d.open);
            const yClose = scaleY(d.close);
            const yHigh = scaleY(d.high);
            const yLow = scaleY(d.low);

            const color = d.close >= d.open ? 'green' : 'red';
            ctx.strokeStyle = color;
            ctx.fillStyle = color;

            // Wick
            ctx.beginPath();
            ctx.moveTo(x, yHigh);
            ctx.lineTo(x, yLow);
            ctx.stroke();

            // Body
            const bodyHeight = Math.abs(yClose - yOpen);
            ctx.fillRect(x - candleWidth / 2, Math.min(yOpen, yClose), candleWidth, bodyHeight || 1);
        });

        // Draw axes
        ctx.strokeStyle = '#000';
        ctx.beginPath();
        ctx.moveTo(paddingLeft, paddingTop);
        ctx.lineTo(paddingLeft, height - paddingBottom);
        ctx.lineTo(width - paddingRight, height - paddingBottom);
        ctx.stroke();

        // Draw Y-axis ticks and labels
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';

        const numTicks = 5;
        for (let i = 0; i <= numTicks; i++) {
            const price = minPrice + (i / numTicks) * (maxPrice - minPrice);
            const y = scaleY(price);

            // Tick line
            ctx.strokeStyle = '#000';
            ctx.beginPath();
            ctx.moveTo(paddingLeft - 5, y);
            ctx.lineTo(paddingLeft, y);
            ctx.stroke();

            // Label
            ctx.fillText(price.toFixed(2), paddingLeft - 7, y + 3);
        }

        // Draw X-axis labels (date and time)
        ctx.textAlign = 'center';
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';

        const xLabelCount = Math.min(data.length, 6);

        // Determine if all data is from the same day
        const firstDate = new Date(data[0].date * 1000);
        const sameDay = data.every(d => {
            const date = new Date(d.date * 1000);
            return date.getFullYear() === firstDate.getFullYear() &&
                date.getMonth() === firstDate.getMonth() &&
                date.getDate() === firstDate.getDate();
        });

        for (let i = 0; i < xLabelCount; i++) {
            const idx = Math.floor(i * (data.length - 1) / (xLabelCount - 1));
            const x = paddingLeft + idx * spacing + spacing / 2;
            const d = data[idx];
            const date = new Date(d.date * 1000);

            if (sameDay) {
                // Show only time
                const hours24 = date.getHours();
                const minutes = date.getMinutes().toString().padStart(2, '0');
                const period = hours24 >= 12 ? 'PM' : 'AM';
                const hours12 = hours24 % 12 || 12;
                const timeStr = `${hours12}:${minutes} ${period}`;
                ctx.fillText(timeStr, x, height - paddingBottom + 18);
            } else {
                // Show only date
                const dateStr = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
                ctx.fillText(dateStr, x, height - paddingBottom + 18);
            }
        }
    }





    init() {
        this.resize();
        const that = this;

        function tick() {
            that.frame();
            requestAnimationFrame(tick);
        }
        tick();
    }
}

window.FinanceChart = FinanceChart;

export default FinanceChart;