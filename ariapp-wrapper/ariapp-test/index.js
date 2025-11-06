import Ariapp from "../ariapp/index.js";

const ariapp = new Ariapp({
    port: 4500,
    include: ["/public"],

    globalFolder: "/public/all",
    globalMeta: [
        `<link rel="stylesheet" href="@global/all.css">`
    ],

    // TODO allowed connections
    routes: [
        new Ariapp.PageRoute({
            path: "/",
            filePath: `public/pages/index.html`
        })
    ]
});


