import { Router } from "express";
import CartManager from "../managers/CartManager.js";
import ProductManager from "../managers/ProductManager.js";
import { authRequired } from "../middlewares/auth.js";

const router = Router();
const cartsManager = new CartManager();
const productsManager = new ProductManager();

router.post("/", authRequired, async (req, res) => {
  const cart = await cartsManager.createCart();
  res.status(201).json(cart);
});

router.get("/:cid", authRequired, async (req, res) => {
  const cart = await cartsManager.getCartById(req.params.cid);
  if (!cart) return res.status(404).json({ error: "Not found" });
  res.json(cart);
});

router.post("/:cid/product/:pid", authRequired, async (req, res) => {
  try {
    const product = await productsManager.getProductById(req.params.pid);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const cart = await cartsManager.addProductToCart(req.params.cid, req.params.pid);
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    res.json(cart);
  } catch (err) {
    res.status(400).json({ error: err?.message || "Bad Request" });
  }
});

router.delete("/:cid/products/:pid", authRequired, async (req, res) => {
  const cart = await cartsManager.removeProductFromCart(req.params.cid, req.params.pid);
  if (cart === null) return res.status(404).json({ error: "Cart not found" });
  if (cart === false) return res.status(404).json({ error: "Product not found in cart" });
  res.json(cart);
});

router.put("/:cid", authRequired, async (req, res) => {
  try {
    const products = Array.isArray(req.body) ? req.body : req.body?.products;
    const cart = await cartsManager.updateCart(req.params.cid, products);
    if (!cart) return res.status(404).json({ error: "Cart not found" });
    res.json(cart);
  } catch (err) {
    res.status(400).json({ error: err?.message || "Bad Request" });
  }
});

router.put("/:cid/products/:pid", authRequired, async (req, res) => {
  try {
    const cart = await cartsManager.updateProductQuantity(
      req.params.cid,
      req.params.pid,
      req.body?.quantity
    );
    if (cart === null) return res.status(404).json({ error: "Cart not found" });
    if (cart === false) return res.status(404).json({ error: "Product not found in cart" });
    res.json(cart);
  } catch (err) {
    res.status(400).json({ error: err?.message || "Bad Request" });
  }
});

router.delete("/:cid", authRequired, async (req, res) => {
  const cart = await cartsManager.clearCart(req.params.cid);
  if (!cart) return res.status(404).json({ error: "Cart not found" });
  res.json(cart);
});

export default router;
