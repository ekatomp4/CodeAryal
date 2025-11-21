class FinanceChart {
    constructor(container, settings = {
        showMax: false,
        offset: 0
    }) {
        this.container = container;
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d");
        this.container.appendChild(this.canvas);

        // window.addEventListener("resize", () => this.resize());

        this.showMax = settings.showMax || false;
        this.offset = settings.offset || 0;

        this.data = [];
        this.running = false;

        this.settings = {
            color: {
                up: "#73ff69",
                down: "#ff6666",
                line: "#ffffff94",
                text: "#ffffff",
                prediction: "#196bbd94",
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


        this.activeIndicators = [];

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

    setIndicators(indicators) {
        this.activeIndicators = indicators;
        console.log(this.activeIndicators);
        this.calculateIndicators();
    }
    setIndicatorColor(name, color) {
        this.settings.color.indicators[name] = color;
        this.calculateIndicators();
    }

    resize() {
        this.canvas.style.width = this.container.clientWidth + "px";
        this.canvas.style.height = this.container.clientHeight + "px";
        this.canvas.width = this.container.clientWidth | 0;
        this.canvas.height = this.container.clientHeight | 0;
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
            const key = `${ind.name}_${ind.period}_${Math.round(Math.random() * 10000)}`;
            ind._key = key;

            const fn = this.indicatorCalculators[ind.name];
            if (!fn) continue;

            const values = fn(closes, ind.period);
            this.calculatedIndicators[key] = values;
        }
    }

    drawIndicators(scaleY, scaleX) {
        const ctx = this.ctx;

        for (const ind of this.activeIndicators) {
            const values = this.calculatedIndicators[ind._key];
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

        const data = this.showMax ? this.data.slice(-this.showMax - this.offset) : this.data;
        if (!data || data.length === 0) {
            this.running = false;
            return;
        }

        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        const { left: paddingLeft, right: paddingRight, top: paddingTop, bottom: paddingBottom } = this.padding;
        const chartWidth = width - paddingLeft - paddingRight;
        const chartHeight = height - paddingTop - paddingBottom;

        let minPrice = Infinity;
        let maxPrice = -Infinity;

        data.forEach(d => {
            minPrice = Math.min(minPrice, d.low);
            maxPrice = Math.max(maxPrice, d.high);
        });

        // Add padding to min/max so wicks are visible
        const paddingPercent = 0.02; // 2%
        const minPriceAdjusted = minPrice - (maxPrice - minPrice) * paddingPercent;
        const maxPriceAdjusted = maxPrice + (maxPrice - minPrice) * paddingPercent;

        const scaleY = price =>
            paddingTop + chartHeight - ((price - minPriceAdjusted) / (maxPriceAdjusted - minPriceAdjusted)) * chartHeight;

        // Spacing and candle width
        const spacing = Math.max(chartWidth / data.length, 2); // at least 2px per candle
        const candleWidth = Math.min(spacing * 0.6, 10); // max width 10px
        const scaleX = i => paddingLeft + i * spacing + spacing / 2;

        this.calculateIndicators();

        const predictionPath = new Path2D();
        let firstPrediction = true;

        let lastCloseX = 0;
        let lastCloseY = 0;

        data.forEach((d, i) => {
            const x = scaleX(i);


            if (d.prediction) {
                const prediction = d.prediction;
                const predX = scaleX(i);
                const predY = scaleY(prediction.close); 
                
                if (firstPrediction) {
                    firstPrediction = false;
                    predictionPath.moveTo(lastCloseX, lastCloseY);
                    // predictionPath.moveTo(predX, predY);
                }
            
                predictionPath.lineTo(predX, predY);
                lastCloseX = predX;
                lastCloseY = predY;

                if(d.isOnlyPrediction) {
                    return;
                }
            }

            const yOpen = scaleY(d.open);
            const yClose = scaleY(d.close);
            const yHigh = scaleY(d.high);
            const yLow = scaleY(d.low);

            const up = d.close >= d.open;

            // Draw wick
            ctx.strokeStyle = up ? this.settings.color.up : this.settings.color.down;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, yHigh);
            ctx.lineTo(x, yLow);
            ctx.stroke();

            // Draw body
            ctx.fillStyle = up ? this.settings.color.up : this.settings.color.down;
            const bodyHeight = Math.max(Math.abs(yClose - yOpen), 1); // minimum 1px height
            ctx.fillRect(x - candleWidth / 2, Math.min(yOpen, yClose), candleWidth, bodyHeight);

            // Draw connecting line if enabled
            if (this.settings.line.show && i > 0) {
                const prevClose = scaleY(data[i - 1].close);
                ctx.strokeStyle = this.settings.color.line;
                ctx.lineWidth = this.settings.line.width;
                ctx.beginPath();
                ctx.moveTo(x - spacing, prevClose);
                ctx.lineTo(x, yClose);
                ctx.stroke();
            }

            lastCloseX = x - candleWidth / 2 + candleWidth;
            lastCloseY = Math.min(yOpen, yClose) + bodyHeight
        });

        // draw prediction

        ctx.lineWidth = 3;
        ctx.strokeStyle = this.settings.color.prediction;
        ctx.stroke(predictionPath);

        // draw indicators

        this.drawIndicators(scaleY, scaleX);

        // Draw axes
        ctx.setLineDash([5, 10]);
        ctx.strokeStyle = this.settings.color.text;
        ctx.beginPath();
        ctx.moveTo(paddingLeft, paddingTop);
        ctx.lineTo(paddingLeft, height - paddingBottom);
        ctx.lineTo(width - paddingRight, height - paddingBottom);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw Y-axis ticks and labels
        ctx.fillStyle = this.settings.color.text;
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        const numTicks = 5;
        for (let i = 0; i <= numTicks; i++) {
            const price = minPriceAdjusted + (i / numTicks) * (maxPriceAdjusted - minPriceAdjusted);
            const y = scaleY(price);

            ctx.strokeStyle = this.settings.color.text;
            ctx.beginPath();
            ctx.moveTo(paddingLeft - 5, y);
            ctx.lineTo(paddingLeft, y);
            ctx.stroke();

            ctx.fillText(price.toFixed(4), 5, y + 3);
        }

        // Draw X-axis labels
        ctx.textAlign = 'center';
        ctx.fillStyle = this.settings.color.text;
        ctx.font = '12px Arial';

        const xLabelCount = Math.min(data.length, 6);
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
            if (sameDay) {
                const hours24 = date.getHours();
                const minutes = date.getMinutes().toString().padStart(2, '0');
                const hours12 = hours24 % 12 || 12;
                const period = hours24 >= 12 ? 'PM' : 'AM';
                labelStr = `${hours12}:${minutes} ${period}`;
            } else {
                labelStr = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
            }

            ctx.fillText(labelStr, x, height - paddingBottom + 18);
        }
    }

    // frame() {
    //     this.resize();
    //     this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    //     const data = this.showMax ? this.data.slice(-this.showMax) : this.data;
    //     if (!data || data.length === 0) {
    //         this.running = false;
    //         return;
    //     }

    //     const ctx = this.ctx;
    //     const width = this.canvas.width;
    //     const height = this.canvas.height;


    //     const minPrice = Math.min(...data.map(d => d.low));
    //     const maxPrice = Math.max(...data.map(d => d.high));
    //     this.minPrice = minPrice;
    //     this.maxPrice = maxPrice;

    //     const candleWidth = width / data.length;

    //     const numTicks = data.length;
    //     const scaleX = (x) => width / numTicks * x;
    //     const scaleY = (y) => height - ((y - this.minPrice) / (this.maxPrice - this.minPrice)) * height;

    //     // draw
    //     for (let i = 0; i < data.length; i++) {
    //         const d = data[i];
    //         const x = scaleX(i);
    //         const yOpen = scaleY(d.open);
    //         const yClose = scaleY(d.close);
    //         const yHigh = scaleY(d.high);
    //         const yLow = scaleY(d.low);

    //         const lastOpen = data[i - 1]?.open || d.open;
    //         const lastClose = data[i - 1]?.close || d.close;

    //         const isUp = d.close > d.open;
    //         ctx.fillStyle = isUp ? this.settings.color.up : this.settings.color.down;
    //         const y = Math.min(yOpen, yClose);
    //         const h = Math.max(1, Math.abs(yClose - yOpen));
    //         ctx.fillRect(x, y, candleWidth, h);

    //         // wick
            
    //         ctx.strokeStyle = this.settings.color.text;
    //         ctx.lineWidth = 1;
    //         ctx.beginPath();
    //         ctx.moveTo(x + candleWidth/2, yLow);
    //         ctx.lineTo(x + candleWidth/2, yHigh);
    //         ctx.stroke();


    //     }

    //     // dont worry about indicators yet
    //     // this.drawIndicators(scaleY, scaleX);
    // }


    init() {
        this.running = true;
        this.resize();
        const loop = () => {
            if (this.running) {
                this.frame();
            };
            requestAnimationFrame(loop);
        };
        loop();
    }
}

window.FinanceChart = FinanceChart;
export default FinanceChart;
