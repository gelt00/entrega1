import { promises as fs } from "fs";
import path from "path";

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function normalizeThumbnails(v) {
  if (v == null) return [];
  if (Array.isArray(v)) {
    return v
      .map((x) => (x == null ? "" : String(x)).trim())
      .filter(Boolean);
  }
  if (typeof v === "string") {
    return v
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  throw new Error("thumbnails must be an array of strings");
}

function validateProductPayload(payload, { partial = false } = {}) {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Body inválido");
  }

  const required = ["title", "description", "code", "price", "stock", "category"];
  if (!partial) {
    for (const k of required) {
      if (!(k in payload)) throw new Error(`Falta campo requerido: ${k}`);
    }
  }

  if ("title" in payload && !isNonEmptyString(payload.title)) {
    throw new Error("title debe ser string no vacío");
  }
  if ("description" in payload && !isNonEmptyString(payload.description)) {
    throw new Error("description debe ser string no vacío");
  }
  if ("code" in payload && !isNonEmptyString(payload.code)) {
    throw new Error("code debe ser string no vacío");
  }
  if ("category" in payload && !isNonEmptyString(payload.category)) {
    throw new Error("category debe ser string no vacío");
  }
  if ("price" in payload) {
    const n = Number(payload.price);
    if (!Number.isFinite(n) || n < 0) throw new Error("price debe ser número >= 0");
  }
  if ("stock" in payload) {
    const n = Number(payload.stock);
    if (!Number.isFinite(n) || n < 0) throw new Error("stock debe ser número >= 0");
  }
  if ("status" in payload && typeof payload.status !== "boolean") {
    throw new Error("status debe ser boolean");
  }
  if ("thumbnails" in payload) {
    normalizeThumbnails(payload.thumbnails);
  }
}

export default class ProductManager {
  constructor(filePath, cartsPath = null) {
    this.filePath = filePath;
    this.cartsPath = cartsPath;
  }

  async #ensureFile() {
    try {
      await fs.access(this.filePath);
    } catch {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      await fs.writeFile(this.filePath, "[]", "utf-8");
    }
  }

  async getProducts() {
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
      return data.map((p) => ({ ...p, id: String(p?.id ?? "") }));
    } catch {
      await fs.writeFile(this.filePath, "[]", "utf-8");
      return [];
    }
  }

  async #saveProducts(products) {
    await this.#ensureFile();
    await fs.writeFile(this.filePath, JSON.stringify(products, null, 2), "utf-8");
  }

  newId(products) {
    const maxId = products.reduce((max, p) => {
      const n = Number(p.id);
      return Number.isFinite(n) ? Math.max(max, n) : max;
    }, 0);
    return String(maxId + 1);
  }

  async getProductById(id) {
    const products = await this.getProducts();
    return products.find((p) => String(p.id) === String(id)) || null;
  }

  async addProduct(payload) {
    validateProductPayload(payload, { partial: false });

    const products = await this.getProducts();
    const code = String(payload.code).trim();
    const codeExists = products.some((p) => String(p.code).trim() === code);
    if (codeExists) throw new Error("code ya existe");

    const product = {
      id: this.newId(products),
      title: String(payload.title).trim(),
      description: String(payload.description).trim(),
      code,
      price: Number(payload.price),
      status: "status" in payload ? payload.status : true,
      stock: Number(payload.stock),
      category: String(payload.category).trim(),
      thumbnails: normalizeThumbnails(payload.thumbnails)
    };

    products.push(product);
    await this.#saveProducts(products);
    return product;
  }

  async updateProduct(id, payload) {
    validateProductPayload(payload, { partial: true });

    const products = await this.getProducts();
    const index = products.findIndex((p) => String(p.id) === String(id));
    if (index === -1) return null;

    if ("code" in payload) {
      const nextCode = String(payload.code).trim();
      const conflict = products.some((p, i) => i !== index && String(p.code).trim() === nextCode);
      if (conflict) throw new Error("code ya existe");
    }

    const current = products[index];
    const next = { ...current, ...payload, id: current.id };

    if ("title" in next) next.title = String(next.title).trim();
    if ("description" in next) next.description = String(next.description).trim();
    if ("code" in next) next.code = String(next.code).trim();
    if ("category" in next) next.category = String(next.category).trim();
    if ("price" in next) next.price = Number(next.price);
    if ("stock" in next) next.stock = Number(next.stock);
    if ("thumbnails" in next) next.thumbnails = normalizeThumbnails(next.thumbnails);

    products[index] = next;
    await this.#saveProducts(products);
    return next;
  }

  async deleteProduct(id) {
    const products = await this.getProducts();
    const filtered = products.filter((p) => String(p.id) !== String(id));
    if (filtered.length === products.length) return false;

    await this.#saveProducts(filtered);

    if (this.cartsPath) {
      try {
        const cartsRaw = await fs.readFile(this.cartsPath, "utf-8");
        const carts = JSON.parse(cartsRaw || "[]");
        const updatedCarts = (Array.isArray(carts) ? carts : []).map((cart) => {
          const nextProducts = (cart.products || []).filter(
            (item) => String(item.product) !== String(id)
          );
          return { ...cart, products: nextProducts };
        });
        await fs.writeFile(this.cartsPath, JSON.stringify(updatedCarts, null, 2), "utf-8");
      } catch (err) {
        console.error("Error actualizando carritos:", err);
      }
    }

    return true;
  }
}
