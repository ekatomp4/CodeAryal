import axios from 'axios';
import coinTicker from 'coin-ticker';

class SharedData {
    constructor() {
        this.LAMPORTS_PER_SOL = 1_000_000_000;
        this.SOL_PER_LAMPORT = 1 / this.LAMPORTS_PER_SOL;

        this.USD_PER_SOL = 140;
        this.isEstimated = true;

        // console.log('Fetching exchange rate...');
        this.updateTimeout = 10000;
        this.updateLoop();
    }

    async updateLoop() {
        // https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd
        // {"solana":{"usd":132.92}}

        // try {
        //     const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        //     const data = response.data;
        //     if(!data || !data.solana || !data.solana.usd) return;
        //     this.updateExchangeRate(data.solana.usd);
        // } catch (err) {
        //     console.error('Error fetching exchange rate:', err.response?.data ?? err.message);
        // }

        try {
            const sol = await coinTicker('bitfinex', 'SOL_USD')
            this.updateExchangeRate(Number(sol.last));
        } catch (err) {
            console.error('Error fetching exchange rate:', err.response?.data ?? err.message);
        }

        setTimeout(() => this.updateLoop(), this.updateTimeout);        
    }

    updateExchangeRate(usdPerSol) {
        // console.log('Updated exchange rate:', usdPerSol);
        this.USD_PER_SOL = usdPerSol;
        this.isEstimated = false;
    }

    getFrontendValues() {
        return {
            LAMPORTS_PER_SOL: this.LAMPORTS_PER_SOL,
            SOL_PER_LAMPORT: this.SOL_PER_LAMPORT,
            USD_PER_SOL: this.USD_PER_SOL,
            isEstimated: this.isEstimated
        }
    }
}

export default new SharedData();