import express from 'express';
const app = express();

app.use(express.json());
app.use('/frontend/all', express.static('frontend/all'));
app.use('/frontend/libs', express.static('frontend/libs'));
app.use('/frontend/pages', express.static('frontend/pages'));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.set('trust proxy', true);


// app.use('/media', express.static('frontend/media'));

const PORT = 31198; // cash




// Initialize Endpoints

import EndPoints from './backend/constants/EndPoints.js';
EndPoints.init(app);

// init routes

// Frontend route handling with session check

import SessionManager from "./backend/modules/SessionManager.js";
SessionManager.init();

import fs from "fs";
import path from "path";

const routes = {
  "/": {
    path: "frontend/pages/home/home.html",
    public: true
  },
  "/dashboard": {
    path: "frontend/pages/dashboard/dashboard.html",
    public: false
  },
  "/unauthorized": {
    path: "frontend/401.html",
    public: true
  },
  "/login": {
    path: "frontend/pages/login/login.html",
    public: true
  },
  "/wallet": {
    path: "frontend/pages/wallet/wallet.html",
    public: false,
  },
  "/admin": {
    path: "frontend/pages/admin/admin.html",
    admin: true,
    public: false
  }
};


import SharedData from './backend/constants/SharedData.js';

for (const route in routes) {
  app.get(route, (req, res) => {
    const isByFetch = req.query.fetch !== undefined && req.query.fetch !== null && req.query.fetch === "true";
    const absolutePath = path.resolve(routes[route].path);
    const isPublic = routes[route].public || false;
    const needsAdmin = routes[route].admin || false;

    const session = req.query.session;
    // console.log("Session:", session);
    if (needsAdmin && !session) {
      const isAdminSession = SessionManager.checkAdminSession(session);
      if (!isAdminSession) {
        res.status(401).send("Unauthorized");
      }
      res.status(401).send("Unauthorized");
    }

    fs.readFile(absolutePath, "utf8", (err, html) => {
      if (err) {
        res.status(404).send("Page not found");
        return;
      }

      // Inject a blank script tag before </body>
      let modifiedHTML = html;

      const shared_frontend_data = SharedData.getFrontendValues();

      if (!isByFetch) {
        modifiedHTML = html.replace(
          /<\/body>/i,
          `<script defer>
                        window.sharedData = JSON.parse(\`${JSON.stringify(shared_frontend_data)}\`);
                        // window.cachedPages = {};
                        window.getSession = () => sessionStorage.getItem("session");

                        window.routeTo = async (route) => {
                           window.location.href = route;
                        };
                                                
                        window.addEventListener('sessionValid', () => {
                            console.log("Session is valid");
                        });

                        function reroute() {
                            // ${isPublic ? '' : 'routeTo("/unauthorized");'}
                            ${isPublic ? '' : 'routeTo("/login");'}
                        }
                        function checkSession() {
                            fetch("http://localhost:31198/api/getSession/" + session, {
                                method: "GET",
                                headers: {
                                    "Content-Type": "application/json"
                                }
                            })
                            .then(response => response.json())
                            .then(data => {
                                console.log(data);
                                if (!data.hasSession) {
                                    reroute();
                                } else {
                                    window.dispatchEvent(new Event('sessionValid'));
                                }
                            })
                            .catch(error => console.error("Error:", error.message));
                        }

                        const session = sessionStorage.getItem("session");

                        if (session) {
                            checkSession();
                        } else {
                            reroute();
                        }
    
                    </script>\n</body>`
        );
      }

      modifiedHTML = modifiedHTML.replace(/<head>/i,
        `<head>\n<link rel="stylesheet" href="@all/all.css">\n
                <script type="module" src="@all/all.js"></script>`);

      const aliases = {
        "root": "http://localhost:31198",
        "page": routes[route].path.replace(/\/$/, ''),
        "folder": routes[route].path.substring(0, routes[route].path.lastIndexOf("/")).replace(/\/$/, ''),
        "all": "frontend/all",
        "libs": "frontend/libs",
        "pages": "frontend/pages"
      };

      const aliasPrefix = "@";
      modifiedHTML = modifiedHTML.replace(
        new RegExp(`${aliasPrefix}(\\w+)`, "g"),
        (match, p1) => {
          return aliases[p1] || match;
        }
      );



      res.setHeader("Content-Type", "text/html");
      res.send(modifiedHTML);
    });
  });
}

// app.use((req, res) => {
//     res.redirect("/");
// });


// app.get("/api", (req, res) => {
//     res.send("API");
// });

/// Start server

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});





// TEST BLOCKCHAIN //

import axios from 'axios';

// class BLOCKCHAIN {
//     static async getBalance(system, address) {
//         switch (system) {
//             case "solana":
//                 const response = await axios.post("https://api.mainnet-beta.solana.com", {
//                     jsonrpc: "2.0",
//                     id: 1,
//                     method: "getBalance",
//                     params: [address]
//                 });

//                 const lamports = response.data?.result?.value;
//                 if (lamports !== undefined) {
//                     const sol = lamports / 1_000_000_000;
//                     return sol;
//                 } else {
//                     return 0;
//                 }

//             default:
//                 console.log("Unsupported blockchain system");
//                 return 0;
//         }
//     }
// }

// const solana_address = "GnBP8EpuVkLPACtUKs4jVVHko74EuHqS4QBayJvgzudc";

// BLOCKCHAIN.getBalance("solana", solana_address).then(sol => {
//     console.log(sol); // now it will log
// });





// import SOLANA_NETWORK from './backend/constants/classes/apps/SOLANA_NETWORK.js';
// import SOLANA_SNIPER from './backend/constants/classes/apps/SOLANA_SNIPER.js';



/// JUPITER ///

// get price
// (async () => {
//   const ids = ['So11111111111111111111111111111111111111112', USD_USDC]; // mint(s) to query
//   // const ids = ['SOL'];
//   const url = `https://lite-api.jup.ag/price/v3?ids=${ids.join(',')}`;

//   try {
//     const res = await axios.get(url);
//     const data = res.data;
//     console.log(data);
//   } catch (err) {
//     console.error('Error fetching SOL price:', err.response?.data ?? err.message);
//   }
// })();



function getTrending() {
  // https://lite-api.jup.ag/tokens/v2/toptrending/6h?limit=50
}

const trainingDataFolder = "./training-data/";
const datasets = ["XBTUSD", "ETHUSD"]
// https://query1.finance.yahoo.com/v1/finance/search?q=solana&lang=en-US&region=US&quotesCount=6&newsCount=3&listsCount=2&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query&multiQuoteQueryId=multi_quote_single_token_query&newsQueryId=news_cie_vespa&enableCb=false&enableNavLinks=true&enableEnhancedTrivialQuery=true&enableResearchReports=true&enableCulturalAssets=true&enableLogoUrl=true&enableLists=false&recommendCount=5&enableCccBoost=true&enablePrivateCompany=true
import tardis from 'tardis-dev';
const { replayNormalized, normalizeTrades } = tardis;

async function collectData(ticker) {
  let selectedSet = ticker;
  try {
    const INTERVAL = 60 * 1000;
    const floorToInterval = ts =>
      Math.floor(new Date(ts).getTime() / INTERVAL) * INTERVAL;

    // reset candle map each run
    const candles = new Map();

    const messages = replayNormalized(
      {
        exchange: 'bitmex',
        symbols: [selectedSet],
        from: '2019-05-01',
        to: '2019-05-02'
      },
      normalizeTrades
    );

    const stream = fs.createWriteStream(trainingDataFolder + selectedSet + ".json");
    stream.write('[\n');

    let max = 2_000_000;
    let count = 0;
    let tradeCount = 0;
    let first = true;

    for await (const msg of messages) {
      if (count++ >= max) break;
      if (msg.type !== 'trade') continue;

      tradeCount++;

      if (tradeCount % 10000 === 0)
        console.log(`${tradeCount} trades processed...`);

      const price = msg.price;
      const volume = msg.amount;
      const bucket = floorToInterval(msg.timestamp);

      let candle = candles.get(bucket);

      if (!candle) {
        candle = {
          time: new Date(bucket).toISOString(),
          open: price,
          high: price,
          low: price,
          close: price,
          volume: volume
        };
        candles.set(bucket, candle);
      } else {
        candle.high = Math.max(candle.high, price);
        candle.low = Math.min(candle.low, price);
        candle.close = price;
        candle.volume += volume;
      }
    }

    // write candles to stream
    for (const candle of candles.values()) {
      if (!first) stream.write(',\n');
      first = false;
      stream.write(JSON.stringify(candle));
    }

    stream.write('\n]');
    stream.end();
    console.log(`Generated ${candles.size} candles for ${selectedSet}`);

    return true;
  } catch (err) {
    console.error('Error generating candles:', err);
  }
}

async function collectAllData() {
  for (const dataset of datasets) {
    console.log(`Collecting data for ${dataset}`);
    await collectData(dataset);
  }
}

// collectAllData();
// collectData("XRPUSD");



// AI //


import AI from './ai/AI.js';

// (async () => {
//   const ai = new AI();
//   await ai.loadSave();
//   await ai.predictTest();
// })();
