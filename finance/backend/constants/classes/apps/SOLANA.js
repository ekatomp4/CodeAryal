import {
    Connection,
    PublicKey,
    Keypair,
    sendAndConfirmTransaction,
    VersionedTransaction
} from '@solana/web3.js';
import axios from 'axios';
import bs58 from 'bs58';

class SOLANA {
    /**
     * @param {object} config
     * @param {string} config.address - your public key (base58)
     * @param {string} config.base58PrivateKey - your private key in base58
     */
    constructor({ address, base58PrivateKey }) {
        console.log('[Init] Setting up Solana connection and wallet...');
        this.connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        this.address = new PublicKey(address);
        this.rawAddress = this.address;

        const secretKey = bs58.decode(base58PrivateKey);
        this.keypair = Keypair.fromSecretKey(secretKey);
        console.log('[Init] Wallet loaded:', this.address.toBase58());
    }

    // Get SOL balance
    // async getBalance() {
    //     console.log('[Balance] Fetching SOL balance...');
    //     const lamports = await this.connection.getBalance(this.address);
    //     const sol = lamports / 1_000_000_000;
    //     console.log('[Balance] SOL Balance:', sol);
    //     return sol;
    // }

    async getPosition(address) {
        
    }

    async getBalance() {
        console.log('[Balance] Fetching SOL balance...');
        const lamports = await this.connection.getBalance(this.address);
        const sol = lamports / 1_000_000_000;
        // console.log('[Balance] SOL Balance:', sol);
        return sol;
    }

    static async getBalance( creds, queries ) {
        const address = creds.address;
        if(!address) return null;
        const url = `https://lite-api.jup.ag/ultra/v1/balances/${address}`;
        const res = await axios.get(url);
        const data = res.data;
        console.log('Balances:', data);
        return data;
    }
 
    // Swap tokens using Jupiter API
    async swap({ inputMint, outputMint, amount, slippage = 1 }) {
        try {
            console.log('[Swap] Requesting quote from Jupiter...');
            const quoteRes = await axios.get('https://lite-api.jup.ag/swap/v1/quote', {
                params: {
                    inputMint,
                    outputMint,
                    amount: amount.toString(),
                    slippageBps: slippage * 100,
                    onlyDirectRoutes: false
                }
            });

            const quote = quoteRes.data;
            console.log('[Swap] Quote received:', JSON.stringify(quote, null, 2));
            // $0.000029702 transaction fee
            /*
            [Swap] Quote received: {
              "inputMint": "So11111111111111111111111111111111111111112",
              "inAmount": "100000",
              "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
              "outAmount": "14190",
              "otherAmountThreshold": "14049",
              "swapMode": "ExactIn",
              "slippageBps": 100,
              "platformFee": null,
              "priceImpactPct": "0",
              "routePlan": [
                {
                  "swapInfo": {
                    "ammKey": "4YVLUZGEhsjfsWuxRbo6h18vL297HYRHTrLVE8bwpyCW",
                    "label": "Meteora DLMM",
                    "inputMint": "So11111111111111111111111111111111111111112",
                    "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                    "inAmount": "100000",
                    "outAmount": "14190",
                    "feeAmount": "12",
                    "feeMint": "So11111111111111111111111111111111111111112"
                  },
                  "percent": 100,
                  "bps": 10000
                }
              ],
              "contextSlot": 380400219,
              "timeTaken": 0.001389837,
              "swapUsdValue": "0.0141827594064634323574067851",
              "simplerRouteUsed": false,
              "mostReliableAmmsQuoteReport": {
                "info": {
                  "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE": "14176",
                  "BZtgQEyS6eXUXicYPHecYQ7PybqodXQMvkjUbP4R8mUU": "14179"
                }
              },
              "useIncurredSlippageForQuoting": null,
              "otherRoutePlans": null,
              "loadedLongtailToken": false,
              "instructionVersion": null
            }
            */

            if (!quote) throw new Error('No quote received from Jupiter');

            const solMint = 'So11111111111111111111111111111111111111112';
            const wrapSol = (inputMint === solMint || outputMint === solMint);

            const swapBody = {
                userPublicKey: this.address.toBase58(),
                quoteResponse: quote,
                wrapAndUnwrapSol: wrapSol,
                dynamicComputeUnitLimit: true,
                prioritizationFeeLamports: {
                    priorityLevelWithMaxLamports: {
                        maxLamports: 10_000_000,
                        priorityLevel: "veryHigh"
                    }
                }
            };

            console.log('[Swap] Sending swap request to Jupiter...');
            const swapRes = await axios.post('https://lite-api.jup.ag/swap/v1/swap', swapBody);

            const { swapTransaction } = swapRes.data;
            if (!swapTransaction) throw new Error('No swapTransaction returned from Jupiter');
            console.log('[Swap] Swap transaction received');

            const txBuffer = Buffer.from(swapTransaction, 'base64');
            console.log('[Swap] Decoding versioned transaction...');
            const versionedTx = VersionedTransaction.deserialize(txBuffer);

            console.log('[Swap] Signing transaction with wallet...');
            versionedTx.sign([this.keypair]);

            console.log('[Swap] Sending transaction to Solana network...');
            const txid = await sendAndConfirmTransaction(this.connection, versionedTx);
            console.log('[Swap] Transaction confirmed! TXID:', txid);

            return txid;

        } catch (err) {
            console.error('[Swap] Error:', err.response?.data ?? err.message);
            throw err;
        }
    }


    // static requiredFunctions = [
    //     "getBalance",        // Retrieve account balance
    //     "getPositions",      // List all open positions
    //     "getOrders",         // List all current/pending orders
    //     "placeOrder",        // Create a new order
    //     "cancelOrder",       // Cancel an order
    //     "authenticate",      // Handle login/session logic
    //     "refreshSession",    // Renew credentials when needed
    //     "instantBuy",        // buy at market price
    //     "instantSell" ,       // sell at market price
    // ];


    // fucntions

    static getFunctionList(creds, queries) {
        try {
            console.log('[Init] Solana functions loaded:', creds);

            // 40 concurrent connections max
            const sol = new SOLANA(creds);
            return {
                getbalance: async (creds, queries) =>  await sol.getBalance(),
                // getPositions: sol.getPositions,
                // getOrders: sol.getOrders,
                // placeOrder: sol.placeOrder,
                // cancelOrder: sol.cancelOrder,
                // swap: sol.swap,
            };
        } catch (err) {
            console.error('[Init] Error loading Solana functions:', err);
            throw err;
        }

    }







    
    static async findCheapestRoute({ inputMint, outputMint, amount, slippage = 1 }) {
        
    }


    
}

export default SOLANA;