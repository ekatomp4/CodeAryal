import SessionManager from "../modules/SessionManager.js";


import axios from "axios";

import DataSourceManager from "./managers/DataSourceManager.js";
import TradingAppManager from "./managers/TradingAppManager.js";

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
        
                const sessionUUID = SessionManager.createSession( {
                    name: account.name,
                    password: account.password,
                    IP: IP
                });

                if(!sessionUUID) {
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
                const interval = req.query.interval || "1d";
                const range = req.query.range || "1mo";

                // Only return the data property from axios
                const response = await DataSourceManager.getStockData({ symbol, interval, range });
                return response;
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
            "handler": (req, res) => {
                const { name, command } = req.params;
                const session = req.headers['session']; // or req.get('session')

                if(!command) return res.status(404).json({ error: `Command not found, try /app/[name]/[command], available: ${TradingAppManager.getCommands().join(", ")}` });

                const validApps = TradingAppManager.getAvailableApps();
                if (!validApps.includes(name)) return res.status(404).json({ error: "App not found" });

                const sessionCredentials = SessionManager.getSession(session);
                if(!sessionCredentials[name]) return res.status(401).json({ error: "You do not have access to this app" });


                const commandList = TradingAppManager.openApp(name, sessionCredentials[name]); // pass session if present
                if (!commandList[command]) return res.status(404).json({ error: "Command not found" });

                // TODO passable data to command
                return commandList[command]();

            }
        },

        // EXTRA

        // statistics
        //     - get statistics related to stocks
        //     - get statistics related to apps


    }

    static init(app) {
        // middleware to check session unless public endpoint
        function checkSession(req, res, next) {

            if (!EndPoints.list[req.path]) return next(); // allow normal pages through

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

                    if(returnData && returnData.error) {
                        res.status(returnData.status || 500).json(returnData);
                        return;
                    }

                    res.json(returnData);
                } catch (err) {
                    res.status(500).json();
                    console.error(err.stack);
                }
            });
        }
    }
}

export default EndPoints;
