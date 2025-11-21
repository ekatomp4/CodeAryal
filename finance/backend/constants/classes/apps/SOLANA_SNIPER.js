import SOLANA from './SOLANA.js';
import fs from "fs";
import path from "path";
import axios from 'axios';

async function getAmountForUSD(solanaNetwork, usdAmount, inputMint) {
    const prices = await solanaNetwork.getPrice([inputMint, USD_USDC]);
    const inputPrice = prices[inputMint]?.usdPrice ?? 0; // price in USD
    if (!inputPrice) throw new Error('Price not available for input token');

    if (inputMint === 'So11111111111111111111111111111111111111112') {
        // SOL → lamports
        return Math.round((usdAmount / inputPrice) * 1_000_000_000);
    } else {
        // assume 6 decimals for stablecoins
        return Math.round((usdAmount / inputPrice) * 1_000_000);
    }
    /*
    SOLANA_NETWORK: {
        EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
          usdPrice: 0.9998011291657096,
          blockId: 380723701,
          decimals: 6,
          priceChange24h: 0.004445304938910639
        },
        So11111111111111111111111111111111111111112: {
          usdPrice: 131.83026915386236,
          blockId: 380723713,
          decimals: 9,
          priceChange24h: -2.4431013837002102
        }
      }
    */
}




const STORAGE_FILE = path.resolve('./sniper_storage.json');

function loadStorage() {
    try {
        const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return { lastSeen: [], balances: {} };
    }
}

function saveStorage(storage) {
    console.log('Saving storage...');
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(storage, null, 2));
}

export class SOLANA_SNIPER {
    constructor(config = {}) {
        this.buyThreshold = config.buyThreshold ?? 22;
        this.sellThreshold = config.sellThreshold ?? 10;
        this.pollInterval = config.pollInterval ?? 5000;
        this.maxSpend = config.maxSpend ?? 0.05;
        this.swapFunction = config.swapFunction;
        this.stableMint = config.stableMint;
        this.recentURL = config.recentURL ?? 'https://lite-api.jup.ag/tokens/v2/recent';

        const storage = loadStorage();
        this.lastSeen = new Set(storage.lastSeen);
        this.balances = storage.balances || {};
    }

    persist() {
        saveStorage({
            lastSeen: Array.from(this.lastSeen),
            balances: this.balances
        });
    }

    async scan() {
        const list = await this.fetchRecent();
        const ranked = this.findCandidates(list);
        const top = ranked[0];
        if (!top) return null;

        const { token, score } = top;

        if (score >= this.buyThreshold && !this.lastSeen.has(token.id)) {
            this.lastSeen.add(token.id);
            this.persist();
            await this.onBuySignal(token, score);
        }

        return { token, score };
    }

    async onBuySignal(token, score) {
        console.log("[BUY SIGNAL]", token.symbol, "score:", score);

        if (!this.swapFunction || !this.stableMint) {
            console.warn("Swap function or stablecoin mint not set, cannot execute buy.");
            return;
        }

        const amount = this.maxSpend * 1_000_000; // assume 6 decimals
        try {
            const txid = await this.swapFunction({
                inputMint: this.stableMint,
                outputMint: token.id,
                amount
            });
            console.log(`[BUY] Transaction confirmed: ${txid}`);
            // Track balance for sell
            this.balances[token.id] = (this.balances[token.id] ?? 0) + amount;
            this.persist();
        } catch (err) {
            console.error("[BUY] Swap failed:", err);
        }

        this.monitorToken(token);
    }

    async onSellSignal(token) {
        console.log("[SELL SIGNAL]", token.symbol);

        if (!this.swapFunction || !this.stableMint) {
            console.warn("Swap function or stablecoin mint not set, cannot execute sell.");
            return;
        }

        const balance = this.balances[token.id] ?? 0;
        if (balance <= 0) return;

        try {
            const txid = await this.swapFunction({
                inputMint: token.id,
                outputMint: this.stableMint,
                amount: balance
            });
            console.log(`[SELL] Transaction confirmed: ${txid}`);
            delete this.balances[token.id];
            this.persist();
        } catch (err) {
            console.error("[SELL] Swap failed:", err);
        }
    }

    monitorToken(token) {
        const check = async () => {
            try {
                const updatedList = await this.fetchRecent();
                const updated = updatedList.find(x => x.id === token.id);
                if (!updated) return;

                const score = this.scoreToken(updated);
                if (score <= this.sellThreshold) {
                    await this.onSellSignal(updated);
                } else {
                    setTimeout(check, this.pollInterval);
                }
            } catch (err) {
                console.error("Monitor error:", err);
                setTimeout(check, this.pollInterval);
            }
        };

        setTimeout(check, this.pollInterval);
    }

    async fetchRecent() {
        try {
            const res = await axios.get(this.recentURL);
            return res.data ?? [];
        } catch (err) {
            console.error("Fetch recent tokens failed:", err);
            return [];
        }
    }

    scoreToken(t) {
        let score = 0;

        if (!t.audit?.mintAuthorityDisabled) return -999;
        if (!t.audit?.freezeAuthorityDisabled) return -999;
        if ((t.holderCount ?? 0) < 2) return -999;
        if (!t.icon) return -999;

        const liquidity = t.liquidity ?? 0;
        const liquidityAmounts = {
            2000: 3,
            4500: 2,
            6000: 3,
            50000: 1
        };
        
        for (const key in liquidityAmounts) {
            const amount = Number(key); // convert key to number
            if (liquidity >= amount) {
                score += liquidityAmounts[key];
            }
        }
        
        const fdv = t.fdv ?? Number.MAX_VALUE;
        score += fdv < 5000 ? 5 : fdv < 15000 ? 3 : 0;

        switch (t.organicScoreLabel) {
            case "high": score += 4; break;
            case "medium": score += 2; break;
        }

        if ((t.stats5m?.numBuys ?? 0) > 0) score += 2;
        if ((t.stats5m?.buyVolume ?? 0) > 200) score += 2;
        if ((t.stats5m?.numTraders ?? 0) >= 2) score += 2;

        const createdAt = new Date(t.firstPool?.createdAt).getTime();
        const ageSec = (Date.now() - createdAt) / 1000;
        if (ageSec < 60) score += 5;
        else if (ageSec < 300) score += 3;

        const curve = t.bondingCurve ?? 1;
        if (curve < 1.5) score += 2;
        if (curve > 5) score -= 3;

        return score;
    }

    findCandidates(list) {
        return (list ?? [])
            .map(t => ({ token: t, score: this.scoreToken(t) }))
            .filter(x => x.score > 0)
            .sort((a, b) => b.score - a.score);
    }
}

// Usage
const USD_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const solana = new SOLANA({
    address: 'GnBP8EpuVkLPACtUKs4jVVHko74EuHqS4QBayJvgzudc',
    base58PrivateKey: 'private_key'
});
const balance = await solana.getBalance();
console.log('Balance:', balance);

const sniper = new SOLANA_SNIPER({
    swapFunction: async ({ inputMint, outputMint }) => {
        const amount = await getAmountForUSD(solana, 0.5, inputMint);
        return solana.swap({ inputMint, outputMint, amount });
    },
    stableMint: USD_USDC,
});

async function startSniper() {
    console.log("Sniper started...");
    while (true) {
        try {
            const result = await sniper.scan();
            if (result) {
                console.log("Scan result:", result.token.symbol, "Score:", result.score);
            }
        } catch (e) {
            console.error("Scan error:", e);
        }
        await new Promise(res => setTimeout(res, 2000));
    }
}

// startSniper();



export default SOLANA_SNIPER;
