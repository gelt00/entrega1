import { Router } from "express";
import path from "path";
import ProductManager from "../managers/ProductManager.js";
import { authRequired } from "../middlewares/auth.js";

const router = Router();
const manager = new ProductManager(path.resolve("src/data/products.json"), path.resolve("src/data/carts.json"));

router.get("/", authRequired, async (req, res) => {
  const products = await manager.getProducts();
  res.json(products);
});

router.get("/:pid", authRequired, async (req, res) => {
  const product = await manager.getProductById(req.params.pid);
  if (!product) return res.status(404).json({ error: "Not found" });
  res.json(product);
});

router.post("/", authRequired, async (req, res) => {
  try {
    const product = await manager.addProduct(req.body);
    const io = req.app.get("io");
    if (io) io.emit("products", await manager.getProducts());

    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err?.message || "Bad Request" });
  }
});

router.put("/:pid", authRequired, async (req, res) => {
  try {
    const product = await manager.updateProduct(req.params.pid, req.body);
    if (!product) return res.status(404).json({ error: "Not found" });

    const io = req.app.get("io");
    if (io) io.emit("products", await manager.getProducts());

    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err?.message || "Bad Request" });
  }
});

router.delete("/:pid", authRequired, async (req, res) => {
  const ok = await manager.deleteProduct(req.params.pid);
  if (!ok) return res.status(404).json({ error: "Not found" });

  const io = req.app.get("io");
  if (io) io.emit("products", await manager.getProducts());

  res.json({ deleted: true });
});

export default router;