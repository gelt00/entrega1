import { Router } from "express";
import path from "path";
import CartManager from "../managers/CartManager.js";
import ProductManager from "../managers/ProductManager.js";
import { authRequired } from "../middlewares/auth.js";

const router = Router();
const cartsManager = new CartManager(path.resolve("src/data/carts.json"));
const productsManager = new ProductManager(path.resolve("src/data/products.json"));

router.post("/", authRequired, async (req, res) => {
  const cart = await cartsManager.createCart();
  res.status(201).json(cart);
});

router.get("/:cid", authRequired, async (req, res) => {
  const cart = await cartsManager.getCartById(req.params.cid);
  if (!cart) return res.status(404).json({ error: "Not found" });
  res.json(cart.products);
});

router.post("/:cid/product/:pid", authRequired, async (req, res) => {
  const product = await productsManager.getProductById(req.params.pid);
  if (!product) return res.status(404).json({ error: "Product not found" });

  const cart = await cartsManager.addProductToCart(req.params.cid, req.params.pid);
  if (!cart) return res.status(404).json({ error: "Cart not found" });

  res.json(cart);
});

export default router;