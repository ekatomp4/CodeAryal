import fs from "fs";
import path from "path";

const __dirname = process.cwd();

class StockPoint {
    constructor({ date, open, high, low, close, volume, adjclose }) {
        this.date = date;
        this.open = open;
        this.high = high;
        this.low = low;
        this.close = close;
        this.volume = volume;
        this.adjclose = adjclose;
    }
}

class Paper {
    static saveDir = path.join(__dirname, "constants/classes/paper");
    static saveFilePath = path.join(Paper.saveDir, "data.json");

    // Core parameters
    static secondsPerStep = 3600;          // seconds in one candle
    static intervalDelay = 5000;        // ms between candles
    static volatility = 0.015;          // 1.5% movement per candle
    static subVolatility = 0.002;       // 0.2% per second internal move
    static baseVolume = 2_000_000;      // avg volume baseline

    static data = [];
    static currentPrice = 50;
    static interval = null;

    /**
     * Initialize, load data, and begin simulating
     */
    static start() {
        if (!fs.existsSync(this.saveDir)) {
            fs.mkdirSync(this.saveDir, { recursive: true });
        }

        // Load prior save
        if (fs.existsSync(this.saveFilePath)) {
            try {
                const raw = fs.readFileSync(this.saveFilePath, "utf-8");
                this.data = JSON.parse(raw);
                if (this.data.length > 0) {
                    this.currentPrice = this.data[this.data.length - 1].close;
                    console.log(`[PAPER] Loaded ${this.data.length} candles (Last: $${this.currentPrice.toFixed(2)})`);
                }
            } catch (err) {
                console.error("[PAPER] Corrupted save, resetting:", err);
                this.data = [];
            }
        } else {
            fs.writeFileSync(this.saveFilePath, JSON.stringify([], null, 2));
        }

        this.startLoop();
    }

    /**
     * Start the step loop
     */
    static startLoop() {
        if (this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => this.simulateStep(), this.intervalDelay);
        console.log(`[PAPER] Simulation started (${this.secondsPerStep}s per candle, delay ${this.intervalDelay}ms)`);
    }

    /**
     * Change how often the simulation step runs
     */
    static changeIntervalDelay(newDelay) {
        if (typeof newDelay !== "number" || newDelay <= 0) {
            throw new Error("Invalid delay: must be a positive number (ms)");
        }
        this.intervalDelay = newDelay;
        this.startLoop();
        console.log(`[PAPER] Interval delay updated to ${newDelay}ms`);
    }

    /**
     * Simulate one candle, built from per-second micro-movements
     */
    static simulateStep() {
        const startTime = Date.now();
        const startPrice = this.currentPrice;
        const secondPrices = [startPrice];
        let tempPrice = startPrice;

        // Parameters
        const dt = 1; // 1 second
        const shortMA = 50; // moving average window for trend pull
        const volBase = this.subVolatility; // base second-level volatility

        // Compute moving average for trend pull
        const trend = this.data.length >= shortMA
            ? this.data.slice(-shortMA).reduce((sum, c) => sum + c.close, 0) / shortMA
            : tempPrice;

        for (let i = 1; i < this.secondsPerStep; i++) {
            // Drift toward trend (prevents runaway drift)
            const drift = (trend - tempPrice) * 0.0005;

            // Volatility clustering: increase vol if last move was large
            const lastMove = Math.abs((tempPrice - secondPrices[i - 1]) / secondPrices[i - 1]);
            const vol = volBase * (1 + lastMove * 5);

            // Approximate standard normal random
            const Z = Math.random() * 2 - 1;

            // GBM update
            tempPrice *= Math.exp(drift + vol * Z);

            secondPrices.push(tempPrice);
        }

        // Final micro movement
        const finalMove = Math.random() * 2 - 1;
        tempPrice *= 1 + volBase * finalMove;
        secondPrices.push(tempPrice);

        // Aggregate OHLC
        const open = secondPrices[0];
        const high = Math.max(...secondPrices);
        const low = Math.min(...secondPrices);
        const close = secondPrices[secondPrices.length - 1];

        // Volume linked to price moves
        const movePct = Math.abs((close - open) / open);
        const volume = Math.floor(this.baseVolume * (0.8 + Math.random() * 0.4) * (1 + movePct * 5));

        const date = Math.floor(Date.now() / 1000);
        const round2 = (n) => Math.round(n * 100) / 100;

        const candle = new StockPoint({
            date,
            open: round2(open),
            high: round2(high),
            low: round2(low),
            close: round2(close),
            volume,
            adjclose: round2(close)
        });

        this.data.push(candle);
        this.currentPrice = close;

        // Limit saved data size
        if (this.data.length > 5000) this.data.shift();

        this.save();

        const endTime = Date.now();
        const duration = endTime - startTime;
        const durationStr = `${(duration / 1000).toFixed(2)}s`;

        console.log(`[PAPER] Candle: O:${candle.open} H:${candle.high} L:${candle.low} C:${candle.close} Vol:${candle.volume} (${durationStr})`);
    }


    /**
     * Save data file
     */
    static save() {
        try {
            fs.writeFileSync(this.saveFilePath, JSON.stringify(this.data, null, 2));
        } catch (err) {
            console.error("[PAPER] Save error:", err);
        }
    }

    static setData(newData) {
        this._data = newData;
        fs.writeFileSync(this.saveFilePath, JSON.stringify(this._data, null, 2));
    }





    // SIM TRADING APP

    static account = {
        balance: 500, // starting cash
        positions: [],   // active trades
        orders: []       // pending orders
    };

    /**
     * Handlers for TradingApp integration
     * Each matches one of TradingApp.requiredFunctions
     */
    static getFunctionList() {
        return {

            // Return the paper trading balance
            getBalance: () => {
                return { balance: this.account.balance };
            },

            // List all active positions
            getPositions: () => {
                return [...this.account.positions];
            },

            // List all current/pending orders
            getOrders: () => {
                return [...this.account.orders];
            },

            // Place a new paper order (adds to orders)
            placeOrder: ({ symbol, side, quantity, price }) => {
                const id = Date.now().toString();
                const order = {
                    id,
                    symbol,
                    side, // "buy" or "sell"
                    quantity,
                    price,
                    status: "open",
                    timestamp: Math.floor(Date.now() / 1000)
                };
                this.account.orders.push(order);
                this.save(); // persist to disk
                return order;
            },

            // Cancel an existing order by ID
            cancelOrder: ({ id }) => {
                const order = this.account.orders.find(o => o.id === id);
                if (!order) throw new Error(`Order ${id} not found`);
                order.status = "cancelled";
                this.save();
                return order;
            },

            // Authenticate a paper session (always succeeds)
            authenticate: () => true,
            refreshSession: () => true,


            // Instantly buy at current simulated price
            instantBuy: ({ symbol, quantity }) => {
                const price = this.currentPrice;
                const cost = price * quantity;
                if (this.account.balance < cost) {
                    throw new Error("Insufficient funds");
                }
                this.account.balance -= cost;
                this.account.positions.push({
                    symbol,
                    quantity,
                    price,
                    side: "buy",
                    timestamp: Math.floor(Date.now() / 1000)
                });
                this.save();
                return { symbol, quantity, price, side: "buy" };
            },

            // Instantly sell at current simulated price
            instantSell: ({ symbol, quantity }) => {
                const position = this.account.positions.find(
                    p => p.symbol === symbol && p.side === "buy"
                );
                if (!position || position.quantity < quantity) {
                    throw new Error("Not enough shares to sell");
                }

                const price = this.currentPrice;
                const proceeds = price * quantity;
                this.account.balance += proceeds;

                // Reduce or close position
                position.quantity -= quantity;
                if (position.quantity <= 0) {
                    this.account.positions = this.account.positions.filter(p => p.quantity > 0);
                }

                this.save();
                return { symbol, quantity, price, side: "sell" };
            }
        };
    }
}

export default Paper;
