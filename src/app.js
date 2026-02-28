import express from "express";
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { engine } from "express-handlebars";

import productsRouter from "./routes/products.js";
import cartsRouter from "./routes/carts.js";
import authRouter from "./routes/auth.js";
import viewsRouter from "./routes/views.router.js";
import ProductManager from "./managers/ProductManager.js";

const app = express();
const PORT = 8080;

// __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servidor HTTP + Socket.IO
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer);
app.set("io", io);

// ProductManager
const productManager = new ProductManager(
  path.resolve("src/data/products.json"),
  path.resolve("src/data/carts.json")
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Handlebars
app.engine(
  "handlebars",
  engine({
    extname: ".handlebars",
    defaultLayout: "main",
    layoutsDir: path.join(__dirname, "views", "layouts"),
  })
);
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views"));

// Routers
app.use("/api", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/carts", cartsRouter);
app.use("/", viewsRouter);

// Eventos Socket
io.on("connection", async (socket) => {
  socket.emit("products", await productManager.getProducts());

  socket.on("product:create", async (payload, cb) => {
    try {
      const created = await productManager.addProduct(payload);
      io.emit("products", await productManager.getProducts());
      cb?.({ ok: true, product: created });
    } catch (err) {
      cb?.({ ok: false, error: err?.message || "Error creating product" });
    }
  });

  socket.on("product:delete", async (pid, cb) => {
    try {
      const ok = await productManager.deleteProduct(pid);
      if (!ok) {
        cb?.({ ok: false, error: "Not found" });
        return;
      }
      io.emit("products", await productManager.getProducts());
      cb?.({ ok: true });
    } catch (err) {
      cb?.({ ok: false, error: err?.message || "Error deleting product" });
    }
  });

  socket.on("product:toggle", async ({ id, status }) => {
    await productManager.updateProduct(id, { status });
    io.emit("products", await productManager.getProducts());
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});