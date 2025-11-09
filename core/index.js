import express from "express";
import EndPoints from "./modules/EndPoints.js";
import path from "path";
import fs from "fs";
import os from "os";
import ServiceManager from "./modules/ServiceManager.js";
import Honeypot from "./modules/Honeypot.js";

import AdminPanel from "./modules/AdminPanel.js";
setInterval(()=>{
    AdminPanel.broadcast({
        "uptime": process.uptime() * 1000,
        "services": ServiceManager.services,
        "memory": process.memoryUsage(),
        "cpu": process.cpuUsage(),
        "load": os.loadavg(),
        "connections": AdminPanel.wss ? AdminPanel.wss.clients.size : 0
    });
}, 1000);


const __dirname = path.resolve();


const PORT = 7943;
AdminPanel.init(PORT + 1);
const app = express();
app.use(express.json());

const honeypot = new Honeypot(app);

const KEYS = {
    "admin5923147": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
    "d4f8a1b3c5e6f7a890b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6": null,
};

// Generate random keys
function generateKeys() {
    for (let key in KEYS) {
        KEYS[key] =
            Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }
    console.log("[server] Generated new keys:", KEYS);
    return KEYS;
}

generateKeys();
setInterval(generateKeys, 5 * 60 * 1000); // regenerate every 5 minutes

app.use(express.json());

// --- Important fix #1: define /key route BEFORE middleware ---
app.get("/key/:identifier", (req, res) => {
    const key = KEYS[req.params.identifier];
    if (!key) {
        // TODO may return fake key
        return res.status(404).json({ error: "Key not found" });
    }
    res.json({ key });
});

// admin website in /admin/index.html

const faviconPath = path.join(__dirname, "admin", "favicon.ico");
let jsCode = fs.readFileSync(path.join(__dirname, "admin", "script.js"), "utf-8");
const faviconBase64 = fs.readFileSync(faviconPath).toString("base64");
app.get("/admin/:identifier", (req, res) => {
    const identifier = req.params.identifier;
    const key = KEYS[identifier];
    if (!key) return res.status(404).json({ error: "Key not found" });

    let html = fs.readFileSync(path.join(__dirname, "admin", "index.html"), "utf-8");

    // inject favicon as base64
    html = html.replace(
        "</head>",
        `<link rel="icon" type="image/x-icon" href="data:image/x-icon;base64,${faviconBase64}">\n</head>`
    );


    html = html.replace(
        "</body>",
        `<script>${jsCode}</script>\n</body>`
    );


    res.setHeader("Content-Type", "text/html");
    res.send(html);
});

// --- API key middleware ---
function checkApiKey(req, res, next) {
    const provided = req.headers["x-api-key"];
    if (!provided) {
        return res.status(401).json({ error: "Missing API key" });
    }

    const valid = Object.values(KEYS).includes(provided);
    if (!valid) {
        return res.status(401).json({ error: "Invalid API key" });
    }

    next();
}

app.use(checkApiKey);

// --- Protected endpoints ---
for (const endpoint in EndPoints) {
    const route = EndPoints[endpoint];
    app[route.method](route.path, (req, res) => {
        const returnData = route.handler(req, res);
        res.send(returnData);
    });
}

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}, http://localhost:${PORT}, admin: http://localhost:${PORT}/admin/admin5923147`);
});



// Service Manager
ServiceManager.init();


// --- example client ---
import axios from "axios";

setTimeout(async () => {
    try {
        // fetch current key from server
        const keyRes = await axios.get(`http://localhost:${PORT}/key/d4f8a1b3c5e6f7a890b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6`);
        const key = keyRes.data.key;
        // console.log(`[client] Got key: ${key}`);

        // call the stat endpoint using the fetched key
        const res = await axios({
            method: "get",
            url: `http://localhost:${PORT}/stat`,
            headers: { "x-api-key": key },
        });
        console.log("[client] Response:", res.data);
    } catch (err) {
        console.error("[client] Error:", err.response?.data || err.message);
    }
}, 500);