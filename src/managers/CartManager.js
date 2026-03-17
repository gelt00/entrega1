import { Cart } from "../models/Cart.js";
import { Product } from "../models/Product.js";

function isValidObjectId(id) {
  return typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
}

function formatProductReference(product) {
  if (!product) return null;

  if (product._id) {
    return {
      ...product,
      id: product._id.toString()
    };
  }

  return product.toString();
}

const formatCart = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  obj.id = obj._id.toString();
  obj.products = obj.products?.map((p) => ({
    product: formatProductReference(p.product),
    quantity: p.quantity
  })) || [];
  return obj;
};

async function ensureProductExists(productId) {
  const product = await Product.findById(productId).lean();
  if (!product) throw new Error("Producto no encontrado");
  return product;
}

async function normalizeCartProducts(products) {
  if (!Array.isArray(products)) {
    throw new Error("products debe ser un arreglo");
  }

  const normalized = [];

  for (const item of products) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("Cada producto del carrito debe ser un objeto válido");
    }

    const productId = String(item.product || "").trim();
    const quantity = Number(item.quantity);

    if (!isValidObjectId(productId)) {
      throw new Error("product debe ser un ObjectId válido");
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("quantity debe ser un entero mayor a 0");
    }

    await ensureProductExists(productId);
    normalized.push({ product: productId, quantity });
  }

  return normalized;
}

export default class CartManager {
  async getCarts() {
    const carts = await Cart.find().populate('products.product').lean();
    return carts.map(c => {
      c.id = c._id.toString();
      c.products = c.products?.map(p => ({
        product: p.product?._id ? p.product._id.toString() : p.product.toString(),
        quantity: p.quantity
      })) || [];
      return c;
    });
  }

  async createCart() {
    const newCart = await Cart.create({ products: [] });
    return formatCart(newCart);
  }

  async getCartById(id) {
    if (!isValidObjectId(id)) return null;
    const cart = await Cart.findById(id).populate("products.product").lean();
    return formatCart(cart);
  }

  async addProductToCart(cid, pid) {
    if (!isValidObjectId(cid) || !isValidObjectId(pid)) return null;

    await ensureProductExists(pid);

    const cart = await Cart.findById(cid);
    if (!cart) return null;

    const existingIndex = cart.products.findIndex(p => p.product.toString() === pid);

    if (existingIndex !== -1) {
      cart.products[existingIndex].quantity += 1;
    } else {
      cart.products.push({ product: pid, quantity: 1 });
    }

    await cart.save();
    return this.getCartById(cart._id.toString());
  }

  async removeProductFromCart(cid, pid) {
    if (!isValidObjectId(cid) || !isValidObjectId(pid)) return null;

    const cart = await Cart.findById(cid);
    if (!cart) return null;

    const initialLength = cart.products.length;
    cart.products = cart.products.filter((item) => item.product.toString() !== pid);

    if (cart.products.length === initialLength) return false;

    await cart.save();
    return this.getCartById(cart._id.toString());
  }

  async updateCart(cid, products) {
    if (!isValidObjectId(cid)) return null;

    const cart = await Cart.findById(cid);
    if (!cart) return null;

    const normalizedProducts = await normalizeCartProducts(products);
    cart.products = normalizedProducts;
    await cart.save();

    return this.getCartById(cart._id.toString());
  }

  async updateProductQuantity(cid, pid, quantity) {
    if (!isValidObjectId(cid) || !isValidObjectId(pid)) return null;

    const nextQuantity = Number(quantity);
    if (!Number.isInteger(nextQuantity) || nextQuantity <= 0) {
      throw new Error("quantity debe ser un entero mayor a 0");
    }

    const cart = await Cart.findById(cid);
    if (!cart) return null;

    const productEntry = cart.products.find((item) => item.product.toString() === pid);
    if (!productEntry) return false;

    productEntry.quantity = nextQuantity;
    await cart.save();

    return this.getCartById(cart._id.toString());
  }

  async clearCart(cid) {
    if (!isValidObjectId(cid)) return null;

    const cart = await Cart.findById(cid);
    if (!cart) return null;

    cart.products = [];
    await cart.save();

    return this.getCartById(cart._id.toString());
  }
}
