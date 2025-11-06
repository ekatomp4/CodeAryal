
/**
 * Base class for all routes
 * @class Route
 * @property {string} path - The path of the route
 * @property {string} method - The HTTP method of the route (get or post)
 * @property {function} handler - The handler for the route
 */
export default class Route {
	constructor({ path, method = "get", handler = () => { }, type = "basic" }) {
		if (typeof path !== "string") throw new Error("Path must be a string");
		if (method !== "get" && method !== "post") throw new Error("Method must be 'get' or 'post'");
		if (typeof handler !== "function") throw new Error("Handler must be a function");
		this.path = path;
		this.method = method;
		this.handler = handler;
		this.type = type;
	}

	/**
	 * Initialize the route with the express app
	 * @param {express.Application} app - The express app
	 */
	init(ariapp) {
		const app = ariapp.app;
		app[this.method](`${this.path}`, this.handler);
	}
}

/**
 * A route that serves a static file
 * @class PageRoute
 * @extends Route
 * @property {string} path - The path of the route
 * @property {string} filePath - The path of the static file
 */
export class PageRoute extends Route {
	constructor({ path, filePath }) {
		const correctedPath = path.startsWith("/") ? path : `/${path}`;
		super({
			path: correctedPath,
			method: "get",
			handler: (req, res, ariapp) => res.sendFile(filePath),
			type: "page"
		});

		this.filePath = filePath;
		this.cachedFile = null;


		this.addedScripts = [
			`
			function editAliases() {
				// Get query parameters as an object
				const params = Object.fromEntries(new URLSearchParams(window.location.search));

				// Replace @query:name with the corresponding query parameter
				document.querySelectorAll("script").forEach((script) => {
					if (!script.textContent) return;
					script.textContent = script.textContent.replace(/@query:([a-zA-Z0-9_-]+)/g, (match, key) => {
						return params[key] ?? "";
					});
				});
			}
			// Run on page load
			window.addEventListener("DOMContentLoaded", editAliases);

			// Optional: rerun if you have client-side navigation
			window.addEventListener("popstate", editAliases);
			`
		];
	}

	build(ariapp) {
		const aliases = ariapp.aliases;

		this.handler = (req, res) => {
			const filePath = ariapp.path.resolve(process.cwd(), this.filePath);

			if (this.cachedFile) {
				res.type("html").send(this.cachedFile);
				return;
			}

			let fileData = ariapp.fs.readFileSync(filePath, "utf-8");

			// add global meta
			const globalMeta = ariapp.globalMeta;
			for (const meta of globalMeta) {
				fileData = fileData.replace(/<\/head>/, `${meta}</head>`);
			}

			// aliases replacement
			for (const key in aliases) {
				const value = aliases[key];
				const pattern = new RegExp(`@${key}([^\\s"']*)`, "g");

				if (typeof value === "function") {
					fileData = fileData.replace(pattern, (match, suffix) => {
						const replacement = value(req, res, this.filePath) ?? "";
						return replacement + suffix;
					});
				} else {
					fileData = fileData.replace(pattern, (match, suffix) => value + suffix);
				}
			}

			// replace @query:name server-side
			const url = new URL(req.protocol + '://' + req.get('host') + req.originalUrl);
			fileData = fileData.replace(/@query:([a-zA-Z0-9_-]+)/g, (match, key) => {
				return url.searchParams.get(key) ?? "";
			});

			// inject scripts once
			const scriptsHtml = this.addedScripts.map(script => `<script>${script}</script>`).join('');
			fileData = fileData.replace(/<\/body>/, `${scriptsHtml}</body>`);

			// cache
			this.cachedFile = fileData;

			res.type("html").send(this.cachedFile);
			console.log("Caching file:", filePath);
		};
	}


}

/**
 * A route that returns JSON data
 * @class JsonRoute
 * @extends Route
 * @property {string} path - The path of the route
 * @property {string} [method=get] - The HTTP method of the route
 * @property {function|object} data - The data to be returned
 */
export class JsonRoute extends Route {
	constructor({ path, method = "get", data }) {
		super({
			path,
			method,
			handler: (req, res) => {
				try {
					const result = typeof data === "function" ? data(req) : data;
					res.json(result);
				} catch (err) {
					res.status(500).json({ error: err.message });
				}
			},
			type: "json"
		});
	}
}

/**
 * A route that handles API requests
 * @class ApiRoute
 * @extends Route
 * @property {string} path - The path of the route
 * @property {object} handlers - The handlers for the route
 */
export class ApiRoute extends Route {
	constructor({ path, handlers }) {
		super({
			path,
			method: "use",
			handler: (req, res, next) => {
				const fn = handlers[req.method.toLowerCase()];
				if (fn) return fn(req, res, next);
				res.status(405).send("Method Not Allowed");
			},
			type: "api"
		});
	}
}

/**
 * A route that downloads a file
 * @class DownloadRoute
 * @extends Route
 * @property {string} path - The path of the route
 * @property {string} filePath - The path of the file to be downloaded
 * @property {string} [name] - The name of the downloaded file
 */
export class DownloadRoute extends Route {
	constructor({ path, filePath, name }) {
		super({
			path,
			method: "get",
			handler: (_, res) => {
				const absPath = path.resolve(process.cwd(), filePath);
				res.download(absPath, name || path.basename(absPath));
			},
			type: "download"
		});
	}
}

/**
 * A route that uses an express middleware
 * @class MiddlewareRoute
 * @extends Route
 * @property {function} handler - The middleware handler
 */
export class MiddlewareRoute extends Route {
	constructor({ handler }) {
		super({
			path: "*",
			method: "use",
			handler,
			type: "middleware"
		});
	}
}

/**
 * A route that handles errors and unmatched requests
 * @class ErrorRoute
 * @extends Route
 * @property {function} [handler] - Optional custom error handler
 * @property {number} [status=404] - Default status code for unhandled routes
 */
export class ErrorRoute extends Route {
	constructor({ handler, status = 404 } = {}) {
		super({
			path: "*",
			method: "use",
			handler: (err, req, res, next) => {
				// If Express forwarded an error
				if (err) {
					console.error("Internal Error:", err);
					if (handler) return handler(err, req, res, next);
					return res.status(500).json({
						error: "Internal Server Error",
						message: err.message
					});
				}

				// For unmatched routes
				if (handler) return handler(null, req, res, next);
				res.status(status).json({
					error: "Not Found",
					message: `Route ${req.originalUrl} not found`
				});
			},
			type: "error"
		});
	}
}
