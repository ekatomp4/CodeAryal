import Ariapp from "ariapp";

const ariapp = new Ariapp({
    port: 4500,
    include: ["/public"],
    routes: [
        new Ariapp.PageRoute({
            path: "/",
            filePath: `${Ariapp.DIRNAME}/public/index.html`
        })
    ]
});


