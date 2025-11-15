class FinanceChart {
    constructor(container) {
        this.container = container;
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d");
        this.container.appendChild(this.canvas);

        window.addEventListener("resize", () => this.resize());

        this.data = [];
        this.running = false;

        this.settings = {
            color: {
                up: "#73ff69",
                down: "#ff6666",
                line: "#ffffff94",
                text: "#ffffff",
                indicators: {
                    ema: "#d25f00d0",
                }
            },
            line: {
                width: 2,
                show: false
            }
        };

        this.padding = {
            top: 25,
            bottom: 40,
            left: 50,
            right: 50
        };

        this.activeIndicators = [
            { name: "ema", period: 20 }
        ];

        this.indicatorCalculators = {
            ema: (prices, period) => {
                const k = 2 / (period + 1);
                const out = [];
                let prev = prices[0];
                for (let i = 0; i < prices.length; i++) {
                    const v = prices[i] * k + prev * (1 - k);
                    out.push(v);
                    prev = v;
                }
                return out;
            }
        };

        this.calculatedIndicators = {};

        this.init();
    }

    resize() {
        this.canvas.width = this.container.offsetWidth;
        this.canvas.height = this.container.offsetHeight;
    }

    setData(data) {
        this.data = data;
        this.init();
        return this;
    }

    calculateIndicators() {
        const closes = this.data.map(d => d.close);

        this.calculatedIndicators = {};

        for (const ind of this.activeIndicators) {
            const fn = this.indicatorCalculators[ind.name];
            if (!fn) continue;

            const values = fn(closes, ind.period);
            this.calculatedIndicators[ind.name] = values;
        }
    }

    drawIndicators(scaleY, scaleX) {
        const ctx = this.ctx;

        for (const ind of this.activeIndicators) {
            const values = this.calculatedIndicators[ind.name];
            if (!values) continue;

            const color = this.settings.color.indicators[ind.name];
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.moveTo(scaleX(0), scaleY(values[0]));

            for (let i = 1; i < values.length; i++) {
                ctx.lineTo(scaleX(i), scaleY(values[i]));
            }

            ctx.stroke();
        }
    }

    frame() {
        this.resize();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const data = this.data;
        if (!data || data.length === 0) {
            this.running = false;
            return;
        };

        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        const paddingLeft = this.padding.left;
        const paddingRight = this.padding.right;
        const paddingTop = this.padding.top;
        const paddingBottom = this.padding.bottom;

        const chartWidth = width - paddingLeft - paddingRight;
        const chartHeight = height - paddingTop - paddingBottom;

        let minPrice = Infinity;
        let maxPrice = -Infinity;

        data.forEach(d => {
            minPrice = Math.min(minPrice, d.low);
            maxPrice = Math.max(maxPrice, d.high);
        });

        const scaleY = price =>
            paddingTop + chartHeight - ((price - minPrice) / (maxPrice - minPrice)) * chartHeight;

        const spacing = chartWidth / data.length;
        const scaleX = i => paddingLeft + i * spacing + spacing / 2;

        const candleWidth = spacing * 0.6;

        this.calculateIndicators();

        data.forEach((d, i) => {
            const x = scaleX(i);

            const yOpen = scaleY(d.open);
            const yClose = scaleY(d.close);
            const yHigh = scaleY(d.high);
            const yLow = scaleY(d.low);

            const color = d.close >= d.open ? this.settings.color.up : this.settings.color.down;
            ctx.strokeStyle = color;
            ctx.fillStyle = color;

            ctx.beginPath();
            ctx.moveTo(x, yHigh);
            ctx.lineTo(x, yLow);
            ctx.stroke();

            const bodyHeight = Math.abs(yClose - yOpen);
            ctx.fillRect(x - candleWidth / 2, Math.min(yOpen, yClose), candleWidth, bodyHeight || 1);

            // draw line
            if (this.settings.line.show && i > 0) {
                const prevClose = scaleY(data[i - 1].close);
                ctx.strokeStyle = this.settings.color.line;
                ctx.lineWidth = this.settings.line.width;
                ctx.beginPath();
                ctx.moveTo(x - spacing, prevClose);
                ctx.lineTo(x, yOpen);
                ctx.stroke();
            }
        });

        this.drawIndicators(scaleY, scaleX);

        // draw axis

        // Draw axes
        ctx.strokeStyle = this.settings.color.text;
        ctx.beginPath();
        ctx.moveTo(this.padding.left, this.padding.top);
        ctx.lineTo(this.padding.left, height - this.padding.bottom);
        ctx.lineTo(width - this.padding.right, height - this.padding.bottom);
        ctx.stroke();

        // Draw Y-axis ticks and labels
        ctx.fillStyle = this.settings.color.text;
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';

        const numTicks = 5;
        for (let i = 0; i <= numTicks; i++) {
            const price = minPrice + (i / numTicks) * (maxPrice - minPrice);
            const y = scaleY(price);

            // Tick line
            ctx.strokeStyle = this.settings.color.text;
            ctx.beginPath();
            ctx.moveTo(this.padding.left - 5, y);
            ctx.lineTo(this.padding.left, y);
            ctx.stroke();

            // Label, price
            ctx.fillText(price.toFixed(4), 5, y + 3);
        }

        // Draw X-axis labels
        ctx.textAlign = 'center';
        ctx.fillStyle = this.settings.color.text;
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
            const x = scaleX(idx);
            const d = data[idx];
            const date = new Date(d.date * 1000);

            let labelStr;
            if (sameDay) { // all data is from the same day, show time
                const hours24 = date.getHours();
                const minutes = date.getMinutes().toString().padStart(2, '0');
                const hours12 = hours24 % 12 || 12;
                const period = hours24 >= 12 ? 'PM' : 'AM';
                labelStr = `${hours12}:${minutes} ${period}`;
            } else { // not all data is from the same day, show date
                labelStr = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
            }

            ctx.fillText(labelStr, x, height - this.padding.bottom + 18);
        }

    }

    init() {
        this.running = true;
        this.resize();
        const loop = () => {
            if(this.running) {
                this.frame();
            };
            requestAnimationFrame(loop);
        };
        loop();
    }
}

window.FinanceChart = FinanceChart;
export default FinanceChart;
