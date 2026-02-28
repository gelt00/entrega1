import { Router } from "express";
import path from "path";
import ProductManager from "../managers/ProductManager.js";

const router = Router();

const productManager = new ProductManager(
  path.resolve("src/data/products.json"),
  path.resolve("src/data/carts.json")
);

router.get(["/", "/home"], async (req, res) => {
  const products = await productManager.getProducts();
  res.render("home", { title: "Productos", products });
});

router.get(["/realtimeproducts", "/realtimeProducts"], async (req, res) => {
  const products = await productManager.getProducts();
  res.render("realTimeProducts", { title: "Productos en Tiempo Real", products });
});

export default router;
