"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerShell = exports.Route = exports.RouteAlreadyBoundError = void 0;
const node_path_1 = require("node:path");
const node_fs_1 = require("node:fs");
const node_http_1 = __importDefault(require("node:http"));
class RouteAlreadyBoundError extends Error {
    constructor(route) {
        super(`Route "${route}" is already bound.`);
        this.name = "RouteAlreadyBoundError";
    }
}
exports.RouteAlreadyBoundError = RouteAlreadyBoundError;
class Route {
    constructor(path, method, callback) {
        this.path = path;
        this.method = method;
        this.callback = callback;
    }
    equals(path, method) {
        if (this.path == path && this.method == method) {
            return true;
        }
        return false;
    }
}
exports.Route = Route;
class ServerShell {
    /**
     * Creates an instance of ServerShell using the specified config. Config can be omitted, in which case the default config will be used.
     * @date 2/15/2024 - 1:18:09 PM
     *
     * @constructor
     * @param {http.ServerOptions} config
     */
    constructor(config) {
        this.routes = [];
        this.middleware = () => { };
        this.config = config;
    }
    /**
     * Starts the server on the specified config
     * @date 2/14/2024 - 7:14:42 PM
     *
     * @param {() => void} [callback=() => {}] - Callback called upon the creation of the server
     * @returns {http.Server} The server object used by Deno.serve()
     */
    listen(callback = () => { }) {
        const server = node_http_1.default.createServer((req, res) => {
            this.middleware(req, res);
            let found = false;
            for (const route of this.routes) {
                // @ts-ignore
                if (route.equals(req.url, req.method)) {
                    found = true;
                    route.callback(req, res);
                }
                else if (route.path == req.url && route.method == "ANY") {
                    found = true;
                    route.callback(req, res);
                }
            }
            if (!found) {
                res.writeHead(404, {
                    "Content-Type": "text/html",
                });
                res.end(`Cannot get ${req.url}`);
            }
        });
        server.listen(this.config);
        callback();
        return server;
    }
    /**
     * Sets up a middleware function to be run for each incoming request
     * @date 2/14/2024 - 7:27:36 PM
     *
     * @param {(req: http.IncomingMessage, info: http.ServerResponse) => void} middleware - The middleware function
     */
    use(middleware) {
        this.middleware = middleware;
    }
    /**
     * Scans `staticDirectory` to listen for any incoming request to any of the static assets
     * @date 2/14/2024 - 7:38:18 PM
     *
     * @param {string} staticDirectory - The root directory of the static assets
     * @param {string} staticRoute - The route from which to start scanning. This is the equivalent of removing the `staticDirectory` folder from the resulting route
     */
    useStatic(staticDirectory, staticRoute) {
        const contents = (0, node_fs_1.readdirSync)(staticDirectory);
        for (const entry of contents) {
            const pathnameDir = (0, node_path_1.join)(staticDirectory, entry);
            let pathnameRoute = (0, node_path_1.join)(staticRoute, entry);
            const dirEntry = (0, node_fs_1.lstatSync)(pathnameDir);
            if (dirEntry.isDirectory()) {
                this.useStatic(pathnameDir, pathnameRoute);
            }
            else if (dirEntry.isFile()) {
                const contents = new TextDecoder("utf-8").decode((0, node_fs_1.readFileSync)(pathnameDir));
                const splitFileName = entry.split(".");
                const extension = splitFileName[splitFileName.length - 1];
                splitFileName.pop();
                const name = splitFileName.join(".");
                if (name == "index" && extension == "html") {
                    pathnameRoute = (0, node_path_1.join)(pathnameRoute, "..");
                }
                this.get(pathnameRoute.replaceAll("\\", "/"), (req, res) => {
                    res.writeHead(200, {
                        "Content-Type": MIMEFromExt(extension),
                        "Content-Length": Buffer.byteLength(contents),
                    });
                    res.end(contents);
                });
            }
        }
    }
    /**
     * Equivalent to `useStatic` but allows editing your assets without needing a server reload
     * @date 4/4/2024 - 6:03:50 PM
     *
     * @param {string} directory - The root directory of the assets
     * @param {string} route - The route from which to start scanning. This is the equivalent of removing the `directory` folder from the resulting route
     */
    useDynamic(directory, route) {
        const contents = (0, node_fs_1.readdirSync)(directory);
        for (const entry of contents) {
            const pathnameDir = (0, node_path_1.join)(directory, entry);
            let pathnameRoute = (0, node_path_1.join)(route, entry);
            const dirEntry = (0, node_fs_1.lstatSync)(pathnameDir);
            if (dirEntry.isDirectory()) {
                this.useDynamic(pathnameDir, pathnameRoute);
            }
            else if (dirEntry.isFile()) {
                const splitFileName = entry.split(".");
                const extension = splitFileName[splitFileName.length - 1];
                splitFileName.pop();
                const name = splitFileName.join(".");
                if (name == "index" && extension == "html") {
                    pathnameRoute = (0, node_path_1.join)(pathnameRoute, "..");
                }
                this.get(pathnameRoute.replaceAll("\\", "/"), (req, res) => {
                    const assetContents = new TextDecoder("utf-8").decode((0, node_fs_1.readFileSync)(pathnameDir));
                    res.writeHead(200, {
                        "Content-Type": MIMEFromExt(extension),
                        "Content-Length": Buffer.byteLength(assetContents),
                    });
                    res.end(assetContents);
                });
            }
        }
    }
    /**
     * Binds a new route at `path` to a GET listener
     * @date 2/14/2024 - 7:09:49 PM
     *
     * @param {string} path - The path at which the route will take effect. Must start with a `/`
     * @param {(req: http.IncomingMessage, info: http.ServerResponse) => void} listener - The function that will be run when a request arrives at the specified route
     * @throws `RouteAlreadyBoundError` if the `path` at which we're binding the route is already bound to another route
     */
    get(path, listener) {
        this.routes.forEach((route) => {
            if (route.path == path &&
                (route.method == "GET" || route.method == "ANY")) {
                throw new RouteAlreadyBoundError(path);
            }
        });
        this.routes.push(new Route(path, "GET", listener));
    }
    /**
     * Binds a new route at `path` to a POST listener
     * @date 2/14/2024 - 7:09:49 PM
     *
     * @param {string} path - The path at which the route will take effect. Must start with a `/`
     * @param {(req: http.IncomingMessage, info: http.ServerResponse) => void} listener - The function that will be run when a request arrives at the specified route
     * @throws `RouteAlreadyBoundError` if the `path` at which we're binding the route is already bound to another route
     */
    post(path, listener) {
        this.routes.forEach((route) => {
            if (route.path == path &&
                (route.method == "POST" || route.method == "ANY")) {
                throw new RouteAlreadyBoundError(path);
            }
        });
        this.routes.push(new Route(path, "POST", listener));
    }
    /**
     * Binds a new route at `path` to an OPTIONS listener
     * @date 2/14/2024 - 7:09:49 PM
     *
     * @param {string} path - The path at which the route will take effect. Must start with a `/`
     * @param {(req: http.IncomingMessage, info: http.ServerResponse) => void} listener - The function that will be run when a request arrives at the specified route
     * @throws `RouteAlreadyBoundError` if the `path` at which we're binding the route is already bound to another route
     */
    options(path, listener) {
        this.routes.forEach((route) => {
            if (route.path == path &&
                (route.method == "OPTIONS" || route.method == "ANY")) {
                throw new RouteAlreadyBoundError(path);
            }
        });
        this.routes.push(new Route(path, "OPTIONS", listener));
    }
    /**
     * Binds a new route at `path` to a PUT listener
     * @date 2/14/2024 - 7:09:49 PM
     *
     * @param {string} path - The path at which the route will take effect. Must start with a `/`
     * @param {(req: http.IncomingMessage, info: http.ServerResponse) => void} listener - The function that will be run when a request arrives at the specified route
     * @throws `RouteAlreadyBoundError` if the `path` at which we're binding the route is already bound to another route
     */
    put(path, listener) {
        this.routes.forEach((route) => {
            if (route.path == path &&
                (route.method == "PUT" || route.method == "ANY")) {
                throw new RouteAlreadyBoundError(path);
            }
        });
        this.routes.push(new Route(path, "PUT", listener));
    }
    /**
     * Binds a new route at `path` to a DELETE listener
     * @date 2/14/2024 - 7:09:49 PM
     *
     * @param {string} path - The path at which the route will take effect. Must start with a `/`
     * @param {(req: http.IncomingMessage, info: http.ServerResponse) => void} listener - The function that will be run when a request arrives at the specified route
     * @throws `RouteAlreadyBoundError` if the `path` at which we're binding the route is already bound to another route
     */
    delete(path, listener) {
        this.routes.forEach((route) => {
            if (route.path == path &&
                (route.method == "DELETE" || route.method == "ANY")) {
                throw new RouteAlreadyBoundError(path);
            }
        });
        this.routes.push(new Route(path, "DELETE", listener));
    }
    /**
     * Binds a new route at `path` to a listener for any request method
     * @date 2/14/2024 - 7:09:49 PM
     *
     * @param {string} path - The path at which the route will take effect. Must start with a `/`
     * @param {(req: http.IncomingMessage, info: http.ServerResponse) => void} listener - The function that will be run when a request arrives at the specified route
     * @throws `RouteAlreadyBoundError` if the `path` at which we're binding the route is already bound to another route
     */
    any(path, listener) {
        this.routes.forEach((route) => {
            if (route.path == path) {
                throw new RouteAlreadyBoundError(path);
            }
        });
        this.routes.push(new Route(path, "ANY", listener));
    }
}
exports.ServerShell = ServerShell;
function MIMEFromExt(extension) {
    switch (extension) {
        // text/
        case "html":
        case "htm":
            return "text/html";
        case "css":
            return "text/css";
        case "js":
        case "mjs":
            return "text/javascript";
        case "txt":
            return "text/plain";
        // image/
        case "svg":
            return "image/svg+xml";
        case "apng":
            return "image/apng";
        case "png":
            return "image/png";
        case "gif":
            return "image/gif";
        case "jpg":
        case "jpeg":
            return "image/jpeg";
        case "ico":
            return "image/vnd.microsoft.icon";
        case "mp4":
            return "video/mp4";
        case "mpeg":
            return "video/mpeg";
        case "ogv":
            return "video/ogg";
        case "mp3":
            return "audio/mpeg";
        case "oga":
            return "audio/ogg";
        // application/
        case "json":
            return "application/json";
        case "xml":
            return "application/xml";
        case "zip":
            return "application/zip";
        case "7z":
            return "application/x-7z-compressed";
        case "rar":
            return "application/vnd.rar";
        case "tar":
            return "application/x-tar";
        case "gz":
            return "application/gzip";
        case "php":
            return "application/x-httpd-php";
        case "pdf":
            return "application/pdf";
        case "sh":
            return "application/x-sh";
        // font/
        case "otf":
            return "font/otf";
        case "ttf":
            return "font/ttf";
        default: {
            console.log(`Encountered unknown extension while generating static routes: .${extension} - If you want this fixed as quickly as possible, open an issue at https://github.com/SaphirDeFeu/TSMServerShell-Node/issues`);
            return "text/plain";
        }
    }
}
