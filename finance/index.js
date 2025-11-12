import express from 'express';
const app = express();

app.use(express.json());
app.use('/frontend/all', express.static('frontend/all'));
app.use('/frontend/pages', express.static('frontend/pages'));
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
    }
};

for (const route in routes) {
    app.get(route, (req, res) => {
        const absolutePath = path.resolve(routes[route].path);
        const isPublic = routes[route].public || false;

        fs.readFile(absolutePath, "utf8", (err, html) => {
            if (err) {
                res.status(404).send("Page not found");
                return;
            }

            // Inject a blank script tag before </body>
            let modifiedHTML = html;

            // if (!isPublic) {
                modifiedHTML = html.replace(
                    /<\/body>/i,
                    `<script defer>
                        window.addEventListener('sessionValid', () => {
                            console.log("Session is valid");
                        });

                        function reroute() {
                            ${isPublic ? '' : 'window.location.href = "/unauthorized";'}
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
            // }

            modifiedHTML = modifiedHTML.replace(/<head>/i,
                `<head>\n<link rel="stylesheet" href="@all/all.css">\n
                <script type="module" src="@all/all.js"></script>`);

            const aliases = {
                "root": "http://localhost:31198",
                "page": routes[route].path.replace(/\/$/, ''),
                "folder": routes[route].path.substring(0, routes[route].path.lastIndexOf("/")).replace(/\/$/, ''),
                "all": "frontend/all"
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

app.use((req, res) => {
    res.redirect("/");
});


/// Start server

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});




import TESTER from './backend/modules/TESTER.js';
TESTER.test();