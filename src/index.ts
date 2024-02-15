import { join } from "node:path";
import { readFileSync, readdirSync, lstatSync } from "node:fs";
import http from "node:http";

export class RouteAlreadyBoundError extends Error {
  constructor(route: string) {
    super(`Route "${route}" is already bound.`);
    this.name = "RouteAlreadyBoundError";
  }
}

export class Route {
  path: string;
  method: string;
  callback: (req: http.IncomingMessage, res: http.ServerResponse) => void;
  
  constructor(path: string, method: string, callback: (req: http.IncomingMessage, res: http.ServerResponse) => void) {
    this.path = path;
    this.method = method;
    this.callback = callback;
  }

  equals(path: string, method: string): boolean {
    if(this.path == path && this.method == method) {
      return true;
    }
    return false;
  }
};

export class ServerShell {
  private routes: Array<Route> = [];
  private middleware: (req: http.IncomingMessage, res: http.ServerResponse) => void = () => {};
  private config: http.ServerOptions;
  
  /**
   * Creates an instance of ServerShell using the specified config. Config can be omitted, in which case the default config will be used.
   * @date 2/15/2024 - 1:18:09 PM
   *
   * @constructor
   * @param {http.ServerOptions} config
   */
  constructor(config: http.ServerOptions) {
    this.config = config;
  }

  /**
   * Starts the server on the specified config
   * @date 2/14/2024 - 7:14:42 PM
   * 
   * @param {() => void} [callback=() => {}] - Callback called upon the creation of the server
   * @returns {http.Server} The server object used by Deno.serve()
   */
  listen(callback: () => void = () => {}): http.Server {
    const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
      this.middleware(req, res);
      let found: boolean = false;
      for(const route of this.routes) {
        // @ts-ignore
        if(route.equals(req.url, req.method)) {
          found = true;
          route.callback(req, res);
        } else if(route.path == req.url && route.method == "ANY") {
          found = true;
          route.callback(req, res);
        }
      }
      if(!found) {
        res.writeHead(404, {
          'Content-Type': 'text/html',
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
  use(middleware: (req: http.IncomingMessage, info: http.ServerResponse) => void) {
    this.middleware = middleware;
  }

  /**
   * Scans `staticDirectory` to listen for any incoming request to any of the static assets
   * @date 2/14/2024 - 7:38:18 PM
   *
   * @param {string} staticDirectory - The root directory of the static assets
   * @param {string} staticRoute - The route from which to start scanning. This is the equivalent of removing the `staticDirectory` folder from the resulting route
   */
  useStatic(staticDirectory: string, staticRoute: string) {
    const contents = readdirSync(staticDirectory);
    for(const entry of contents) {
      const pathnameDir = join(staticDirectory, entry);
      let pathnameRoute = join(staticRoute, entry);
      const dirEntry = lstatSync(pathnameDir);
      if(dirEntry.isDirectory()) {
        this.useStatic(pathnameDir, pathnameRoute);
      } else if(dirEntry.isFile()) {
        const contents = new TextDecoder('utf-8').decode(readFileSync(pathnameDir));
        const splitFileName = entry.split('.');
        const extension = splitFileName[splitFileName.length - 1];
        splitFileName.pop();
        const name = splitFileName.join('.');
        if(name == "index" && extension == "html") {
          pathnameRoute = join(pathnameRoute, '..');
        }
        this.get(pathnameRoute.replaceAll('\\', '/'), (req, res) => {
          res.writeHead(200, {
            'Content-Type': MIMEFromExt(extension),
          }).end(contents);
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
  get(path: string, listener: (req: http.IncomingMessage, res: http.ServerResponse) => void) {
    this.routes.forEach((route) => {
      if(route.path == path && (route.method == "GET" || route.method == "ANY")) {
        throw new RouteAlreadyBoundError(path);
      }
    });
    this.routes.push(new Route(path, "GET", listener));
  };

  /**
   * Binds a new route at `path` to a POST listener
   * @date 2/14/2024 - 7:09:49 PM
   *
   * @param {string} path - The path at which the route will take effect. Must start with a `/`
   * @param {(req: http.IncomingMessage, info: http.ServerResponse) => void} listener - The function that will be run when a request arrives at the specified route
   * @throws `RouteAlreadyBoundError` if the `path` at which we're binding the route is already bound to another route
   */
  post(path: string, listener: (req: http.IncomingMessage, res: http.ServerResponse) => void) {
    this.routes.forEach((route) => {
      if(route.path == path && (route.method == "POST" || route.method == "ANY")) {
        throw new RouteAlreadyBoundError(path);
      }
    });
    this.routes.push(new Route(path, "POST", listener));
  };

  /**
   * Binds a new route at `path` to a PUT listener
   * @date 2/14/2024 - 7:09:49 PM
   *
   * @param {string} path - The path at which the route will take effect. Must start with a `/`
   * @param {(req: http.IncomingMessage, info: http.ServerResponse) => void} listener - The function that will be run when a request arrives at the specified route
   * @throws `RouteAlreadyBoundError` if the `path` at which we're binding the route is already bound to another route
   */
  put(path: string, listener: (req: http.IncomingMessage, res: http.ServerResponse) => void) {
    this.routes.forEach((route) => {
      if(route.path == path && (route.method == "PUT" || route.method == "ANY")) {
        throw new RouteAlreadyBoundError(path);
      }
    });
    this.routes.push(new Route(path, "PUT", listener));
  };

  /**
   * Binds a new route at `path` to a DELETE listener
   * @date 2/14/2024 - 7:09:49 PM
   *
   * @param {string} path - The path at which the route will take effect. Must start with a `/`
   * @param {(req: http.IncomingMessage, info: http.ServerResponse) => void} listener - The function that will be run when a request arrives at the specified route
   * @throws `RouteAlreadyBoundError` if the `path` at which we're binding the route is already bound to another route
   */
  delete(path: string, listener: (req: http.IncomingMessage, res: http.ServerResponse) => void) {
    this.routes.forEach((route) => {
      if(route.path == path && (route.method == "DELETE" || route.method == "ANY")) {
        throw new RouteAlreadyBoundError(path);
      }
    });
    this.routes.push(new Route(path, "DELETE", listener));
  };

  /**
   * Binds a new route at `path` to a listener for any request method
   * @date 2/14/2024 - 7:09:49 PM
   *
   * @param {string} path - The path at which the route will take effect. Must start with a `/`
   * @param {(req: http.IncomingMessage, info: http.ServerResponse) => void} listener - The function that will be run when a request arrives at the specified route
   * @throws `RouteAlreadyBoundError` if the `path` at which we're binding the route is already bound to another route
   */
  any(path: string, listener: (req: http.IncomingMessage, res: http.ServerResponse) => void) {
    this.routes.forEach((route) => {
      if(route.path == path) {
        throw new RouteAlreadyBoundError(path);
      }
    });
    this.routes.push(new Route(path, "ANY", listener));
  };
}

function MIMEFromExt(extension: string): string {
  switch(extension) {
    // text/
    case "html": case "htm": return 'text/html';
    case "css": return 'text/css';
    case "js": case "mjs": return 'text/javascript';
    case "txt": return 'text/plain';
    // image/
    case "svg": return 'image/svg+xml';
    case "apng": return 'image/apng';
    case "png": return 'image/png';
    case "gif": return 'image/gif';
    case "jpg": case "jpeg": return 'image/jpeg';
    case "ico": return 'image/vnd.microsoft.icon';
    case "mp4": return 'video/mp4';
    case "mpeg": return 'video/mpeg';
    case "ogv": return 'video/ogg';
    case "mp3": return 'audio/mpeg';
    case "oga": return 'audio/ogg';
    // application/
    case "json": return 'application/json';
    case "xml": return 'application/xml';
    case "zip": return 'application/zip';
    case "7z": return 'application/x-7z-compressed';
    case "rar": return 'application/vnd.rar';
    case "tar": return 'application/x-tar';
    case "gz": return 'application/gzip';
    case "php": return 'application/x-httpd-php';
    case "pdf": return 'application/pdf';
    case "sh": return 'application/x-sh';
    // font/
    case "otf": return 'font/otf';
    case "ttf": return 'font/ttf';
    
    default: {
      console.log(`Encountered unknown extension while generating static routes: .${extension} - If you want this fixed as quickly as possible, open an issue at https://github.com/SaphirDeFeu/TSMServerShell-Node/issues`);
      return 'text/plain';
    };
  }
}