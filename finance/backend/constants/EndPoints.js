import SessionManager from "../modules/SessionManager.js";


import axios from "axios";

import DataSourceManager from "./managers/DataSourceManager.js";
import TradingAppManager from "./managers/TradingAppManager.js";

import SSAPTM from "../../ai/SSAPTM.js";
// import AI from '../../ai/AI.js';

const ai = new SSAPTM();
// ai.trainModel();

// (async () => {
// //   await ai.predictTest();
// })();


class EndPoints {
    static list = {

        "login": {
            "method": "get",
            "path": "/login",
            "handler": (req, res) => {
                const account = { name: req.query.name, password: req.query.password };
                const IP = req.ip;

                if (!account.name || !account.password) {
                    return {
                        error: "Name and password required",
                        status: 400
                    }
                }

                const sessionUUID = SessionManager.createSession({
                    name: account.name,
                    password: account.password,
                    IP: IP
                });

                if (!sessionUUID) {
                    return {
                        error: "Invalid credentials",
                        status: 401
                    }
                }

                // Return value will be auto-JSONed by your framework
                return { session: sessionUUID };
            },
            public: true
        },

        "getAccountData": {
            "method": "get",
            "path": "/getAccountData",
            "handler": (req, res) => {
                const sessionUUID = req.headers["session"];
                // console.log(sessionUUID);
                return SessionManager.getAccountData(sessionUUID);
            },
            public: false
        },

        "getSession": {
            "method": "get",
            "path": "/getSession/:sessionUUID",
            "handler": (req, res) => {
                const sessionUUID = req.params.sessionUUID;
                // console.log(sessionUUID);
                return {
                    hasSession: SessionManager.checkSession(sessionUUID)
                };
            },
            public: true
        },

        "stock": {
            "method": "get",
            "path": "/stock/:symbol",
            "handler": async (req, res) => {
                const symbol = req.params.symbol;
                const interval = req.query.interval || "1m";
                const range = req.query.range || "1wk";
                // Only return the data property from axios
                const response = await DataSourceManager.getStockData({ symbol, interval, range });

                return response;
            }
        },
        "crypto": {
            "method": "get",
            "path": "/crypto/:network/:address",
            "handler": async (req, res) => {
                const network = req.params.network;
                const address = req.params.address;

                if (!network || !address) {
                    return {
                        error: "Network and address required",
                        status: 400
                    }
                }

                let data = null;

                switch (network) {
                    case "solana":
                        data = await DataSourceManager.getSolanaData(address);
                }

                if(!data) {
                    return {
                        error: "Invalid address",
                        status: 400
                    }
                }

                return data;
            }
        },

        // getting and accessing apps

        "app": {
            "method": "get",
            "path": "/app",
            "handler": (req, res) => {
                res.status(404).json({ error: `No app specified, try /app/[name]/[command], available: ${TradingAppManager.getAvailableApps().join(", ")}` });
            }
        },
        "appWithApp": {
            "method": "get",
            "path": "/app/:name",
            "handler": (req, res) => {
                res.status(404).json({ error: `Command not specified, try /app/[name]/[command], available: ${TradingAppManager.getCommands().join(", ")}` });
            }
        },
        "appWithCommand": {
            "method": "get",
            "path": "/app/:name/:command",
            "handler": async (req, res) => {
                const { name, command } = req.params;
                const queries = req.query;
                const session = req.headers['session']; // or req.get('session')

                if (!command) return res.status(404).json({ error: `Command not found, try /app/[name]/[command], available: ${TradingAppManager.getCommands().join(", ")}` });

                const validApps = TradingAppManager.getAvailableApps();
                if (!validApps.includes(name)) return res.status(404).json({ error: "App not found" });

                const sessionCredentials = SessionManager.getSession(session); // session creds
                const appCredentials = sessionCredentials[name];
                if (!appCredentials) return res.status(401).json({ error: "You do not have access to this app" });


                const commandList = TradingAppManager.openApp(name, appCredentials); // pass session if present
                // console.log("commandList", commandList);
                const selectedCommand = commandList[command];
                if (!selectedCommand) return res.status(404).json({ error: "Command not found" });

                // TODO passable data to command
                let data = {
                    error: "Unknown"
                }
                try {
                    // console.log("Selected FN:", selectedCommand);
                    data = await commandList[command]( appCredentials, queries );
                    // console.log("Final data", data);
                } catch(err) {
                    console.error(err);
                }
                

                return data;

            }
        },

        // EXTRA

        // statistics
        //     - get statistics related to stocks
        //     - get statistics related to apps

        // AI

        // ai/predict, body is data array
        "aiPredict": {
            "method": "post",
            "path": "/ai/predict",
            "handler": async (req, res) => {
                const data = req.body;
                const amount = req.query.amount || 1;
                const smooth = req.query.smooth || 0.8;
                if(!data) return res.status(400).json({ error: "Data required" });
                try {
                    const prediction = ai.predictNext(data, amount, smooth);

                    return prediction;
                } catch (err) {
                    console.error(err);
                    return res.status(500).json({ error: err.message });
                }

                return null;
            }
        },


        "getSampleData": {
            "method": "get",
            "path": "/sample",
            "handler": async (req, res) => {
                const giveNext = req.query.givenext || 10;
                const startIndex = req.query.startindex || 0;
                return SSAPTM.getSampleData(giveNext, startIndex);
            }
        }


    }

    static init(app) {
        // middleware to check session unless public endpoint
        function checkSession(req, res, next) {

            return next(); // allow normal pages through

            const session = req.headers.session;

            // Convert object to array for find
            const selectedEndpoint = Object.values(EndPoints.list).find(ep => {
                // naive matching for paths with params
                const basePath = ep.path.replace(/:\w+/g, ""); // remove :param
                return req.path.startsWith(basePath);
            });

            if (selectedEndpoint && selectedEndpoint.public) return next();

            if (session) {
                if (SessionManager.checkSession(session)) {
                    next();
                } else {
                    res.status(401).json({ error: "Unauthorized" });
                }
            } else {
                res.status(401).json({ error: "Unauthorized" });
            }
        }
        app.use(checkSession);

        // endpoints
        for (const endpoint in EndPoints.list) {
            const route = EndPoints.list[endpoint];
            app[route.method](`/api${route.path}`, async (req, res) => {
                try {
                    const returnData = await route.handler(req, res);

                    if (returnData && returnData.error) {
                        res.status(returnData.status || 500).json(returnData);
                        return;
                    }

                    res.json(returnData);
                } catch (err) {

                    // ALL FALLBACK ERROS
                    // res.status(500).json({ error: err.stack || err.message });
                    res.status(500).json({ error: "Internal Server Error" });
                    // console.error(err.stack);
                }
            });
        }
    }
}

export default EndPoints;
