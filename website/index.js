const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');

app.use(express.json());
app.use(express.static('frontend'));

const PORT = process.env.PORT || 4500;


const ALIASES = {
    "image": `http://localhost:${PORT}/media`,
    "root": `http://localhost:${PORT}`,
    "page": (req) => {
        // get very last, without extension page name
		const pageName = req.url.split("/").pop().split(".")[0];
		return `http://localhost:${PORT}/${pageName}`
    }
};

const ROUTES = require('./backend/constants/ROUTES.js');
for (let route in ROUTES) {
    const routePath = route.startsWith("/") ? route : `/${route}`;
    app.get(routePath, (req, res) => {
        const filePath = path.resolve(`./frontend/pages/${ROUTES[route]}/${ROUTES[route]}.html`);
        if (fs.existsSync(filePath)) {
            let fileData = fs.readFileSync(filePath, 'utf-8');

            // Replace aliases
            for (const alias in ALIASES) {
                const value = typeof ALIASES[alias] === 'function'
                    ? ALIASES[alias](req) // call function with request
                    : ALIASES[alias];

                const regex = new RegExp(`@${alias}`, 'g');
                fileData = fileData.replace(regex, value);
            }

            res.setHeader('Content-Type', 'text/html');
            res.send(fileData);
        } else {
            res.status(404).send("Page not found");
        }
    });
}


app.get("/media/:filename", (req, res) => {
    const filename = path.basename(req.params.filename); // strips directory traversal
    const filePath = path.resolve(`./frontend/media/${filename}`);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send("File not found");
    }
});


// Error handler
app.use((err, req, res, next) => {
	console.error('Unhandled error:', err);
	res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
const server = app.listen(PORT, () => {
	console.log(`Server listening on http://localhost:${PORT}`);
});
