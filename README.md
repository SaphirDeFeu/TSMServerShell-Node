# TSM Server Shell

### A TSM Studios production

Minimalist server creation and management library

# Usage

### Create a server from the ServerShell and start listening :

```js
// ESModule
import { ServerShell } from "tsmservershell";
// RequireJS
const { ServerShell } = require("tsmservershell");

const app = new ServerShell();

app.listen();
```

You can use a specific configuration, using `http.ServerOptions` as a basis :

```js
const app = new ServerShell({
  port: 3000,
});

app.listen();
```

### Bind routes to the server :

Use the public methods to add routes going to a specific path of your application, and bind them to a function that will run for all incoming requests going to that route.  
The `req` parameter represents the Request object, and the `res` parameter represents the Response object.

```js
app.get("/get", (req, res) => {
  // Route callback
});

app.post("/post", (req, res) => {
  // Route callback
});
```

### Add middleware :

The middleware function will be called for every incoming requests

```js
app.use((req, res) => {
  // Middleware function
});
```

### Scan a directory for static assets :

```js
app.useStatic("./static/directory", "/route/root");
```

... or use dynamic reloading with `useDynamic` :

```js
app.useDynamic("./any/directory", "/route/root");
```
