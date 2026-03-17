import { Router } from "express";
import ProductManager from "../managers/ProductManager.js";
import CartManager from "../managers/CartManager.js";

const router = Router();

const productManager = new ProductManager();
const cartManager = new CartManager();

function buildViewLink(basePath, query) {
  const params = new URLSearchParams();

  if (query.limit) params.set("limit", String(query.limit));
  if (query.page) params.set("page", String(query.page));
  if (query.sort) params.set("sort", String(query.sort));
  if (query.query) params.set("query", String(query.query));
  if (query.cart) params.set("cart", String(query.cart));

  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

router.get(["/", "/home"], async (req, res) => {
  const products = await productManager.getProducts();
  res.render("home", { title: "Productos", products });
});

router.get("/products", async (req, res) => {
  const { limit, page, sort, query, cart } = req.query;
  const result = await productManager.getProductsPaginated({
    limit,
    page,
    sort,
    query,
    baseUrl: `${req.protocol}://${req.get("host")}${req.originalUrl.split("?")[0]}`
  });

  const currentQuery = {
    limit: limit || 10,
    page: result.page,
    sort: sort || "",
    query: query || "",
    cart: cart || "",
    sortAsc: sort === "asc",
    sortDesc: sort === "desc"
  };

  res.render("products", {
    title: "Catalogo de Productos",
    products: result.payload,
    pagination: {
      ...result,
      prevLinkView: result.prevPage
        ? buildViewLink("/products", { ...currentQuery, page: result.prevPage })
        : null,
      nextLinkView: result.nextPage
        ? buildViewLink("/products", { ...currentQuery, page: result.nextPage })
        : null
    },
    filters: currentQuery
  });
});

router.get("/products/:pid", async (req, res) => {
  const product = await productManager.getProductById(req.params.pid);
  if (!product) {
    return res.status(404).render("productDetail", {
      title: "Producto no encontrado",
      notFound: true
    });
  }

  res.render("productDetail", {
    title: product.title,
    product,
    cartId: req.query.cart || ""
  });
});

router.get("/carts/:cid", async (req, res) => {
  const cart = await cartManager.getCartById(req.params.cid);
  if (!cart) {
    return res.status(404).render("cart", {
      title: "Carrito no encontrado",
      notFound: true
    });
  }

  res.render("cart", {
    title: `Carrito ${cart.id}`,
    cart
  });
});

router.get(["/realtimeproducts", "/realtimeProducts"], async (req, res) => {
  const products = await productManager.getProducts();
  res.render("realTimeProducts", { title: "Productos en Tiempo Real", products });
});

export default router;
