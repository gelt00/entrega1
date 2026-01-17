import { promises as fs } from "fs";
import path from "path";

export default class CartManager {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async #ensureFile() {
    try {
      await fs.access(this.filePath);
    } catch {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      await fs.writeFile(this.filePath, "[]", "utf-8");
    }
  }

  async getCarts() {
    await this.#ensureFile();

    const raw = await fs.readFile(this.filePath, "utf-8");
    const trimmed = raw.trim();

    if (!trimmed) {
      await fs.writeFile(this.filePath, "[]", "utf-8");
      return [];
    }

    try {
      const data = JSON.parse(trimmed);

      if (!Array.isArray(data)) {
        await fs.writeFile(this.filePath, "[]", "utf-8");
        return [];
      }

      const normalized = data.map((c) => ({
        id: c?.id ?? null,
        products: Array.isArray(c?.products) ? c.products : []
      }));

      return normalized;

    } catch (err) {
      await fs.writeFile(this.filePath, "[]", "utf-8");
      return [];
    }
  }

  async saveCarts(carts) {
    await this.#ensureFile();
    await fs.writeFile(this.filePath, JSON.stringify(carts, null, 2), "utf-8");
  }

  newId(carts) {
    const maxId = carts.reduce((max, c) => {
      const n = Number(c.id);
      return Number.isFinite(n) ? Math.max(max, n) : max;
    }, 0);

    return String(maxId + 1);
  }

  async createCart() {
    const carts = await this.getCarts();
    const cart = { id: this.newId(carts), products: [] };
    carts.push(cart);
    await this.saveCarts(carts);
    return cart;
  }

  async getCartById(id) {
    const carts = await this.getCarts();
    return carts.find((c) => String(c.id) === String(id)) || null;
  }

  async addProductToCart(cid, pid) {
    const carts = await this.getCarts();
    const cartIndex = carts.findIndex((c) => String(c.id) === String(cid));
    if (cartIndex === -1) return null;

    const cart = carts[cartIndex];
    if (!Array.isArray(cart.products)) cart.products = [];

    const existing = cart.products.find((p) => String(p.product) === String(pid));

    if (existing) {
      existing.quantity = Number(existing.quantity || 0) + 1;
    } else {
      cart.products.push({ product: String(pid), quantity: 1 });
    }

    carts[cartIndex] = cart;
    await this.saveCarts(carts);
    return cart;
  }
}
