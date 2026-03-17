import { Product } from "../models/Product.js";
import { Cart } from "../models/Cart.js";

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

function parseBooleanQuery(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "available", "disponible"].includes(normalized)) return true;
  if (["false", "0", "unavailable", "not_available", "agotado"].includes(normalized)) return false;
  return null;
}

function buildProductFilter(query) {
  if (!query || typeof query !== "string" || !query.trim()) return {};

  const availability = parseBooleanQuery(query);
  if (availability !== null) {
    return { status: availability };
  }

  return {
    category: { $regex: `^${query.trim()}$`, $options: "i" }
  };
}

const formatProduct = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  obj.id = obj._id.toString();
  return obj;
};

export default class ProductManager {
  async getProducts() {
    const products = await Product.find().lean();
    return products.map(p => {
      p.id = p._id.toString();
      return p;
    });
  }

  async getProductsPaginated({
    limit = 10,
    page = 1,
    sort,
    query,
    baseUrl
  } = {}) {
    const normalizedLimit = Number.isInteger(limit) ? limit : Number(limit);
    const normalizedPage = Number.isInteger(page) ? page : Number(page);
    const safeLimit = Number.isFinite(normalizedLimit) && normalizedLimit > 0 ? normalizedLimit : 10;
    const safePage = Number.isFinite(normalizedPage) && normalizedPage > 0 ? normalizedPage : 1;

    const filter = buildProductFilter(query);
    const sortOption = sort === "asc" ? { price: 1 } : sort === "desc" ? { price: -1 } : undefined;

    const totalDocs = await Product.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalDocs / safeLimit));
    const currentPage = Math.min(safePage, totalPages);
    const skip = (currentPage - 1) * safeLimit;

    const docs = await Product.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(safeLimit)
      .lean();

    const payload = docs.map((doc) => formatProduct(doc));
    const hasPrevPage = currentPage > 1;
    const hasNextPage = currentPage < totalPages;
    const prevPage = hasPrevPage ? currentPage - 1 : null;
    const nextPage = hasNextPage ? currentPage + 1 : null;

    const buildLink = (targetPage) => {
      if (!targetPage || !baseUrl) return null;
      const url = new URL(baseUrl);
      url.searchParams.set("page", String(targetPage));
      url.searchParams.set("limit", String(safeLimit));
      if (query) url.searchParams.set("query", query);
      if (sort === "asc" || sort === "desc") {
        url.searchParams.set("sort", sort);
      }
      return url.toString();
    };

    return {
      status: "success",
      payload,
      totalPages,
      prevPage,
      nextPage,
      page: currentPage,
      hasPrevPage,
      hasNextPage,
      prevLink: buildLink(prevPage),
      nextLink: buildLink(nextPage)
    };
  }

  async getProductById(id) {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) return null;
    const product = await Product.findById(id).lean();
    if (!product) return null;
    product.id = product._id.toString();
    return product;
  }

  async addProduct(payload) {
    validateProductPayload(payload, { partial: false });

    const code = String(payload.code).trim();
    const existing = await Product.findOne({ code });
    if (existing) throw new Error("code ya existe");

    const productData = {
      title: String(payload.title).trim(),
      description: String(payload.description).trim(),
      code,
      price: Number(payload.price),
      status: "status" in payload ? payload.status : true,
      stock: Number(payload.stock),
      category: String(payload.category).trim(),
      thumbnails: normalizeThumbnails(payload.thumbnails)
    };

    const newProduct = await Product.create(productData);
    return formatProduct(newProduct);
  }

  async updateProduct(id, payload) {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) return null;
    validateProductPayload(payload, { partial: true });

    if ("code" in payload) {
      const nextCode = String(payload.code).trim();
      const conflict = await Product.findOne({ code: nextCode, _id: { $ne: id } });
      if (conflict) throw new Error("code ya existe");
    }

    const updates = { ...payload };
    if ("title" in updates) updates.title = String(updates.title).trim();
    if ("description" in updates) updates.description = String(updates.description).trim();
    if ("code" in updates) updates.code = String(updates.code).trim();
    if ("category" in updates) updates.category = String(updates.category).trim();
    if ("price" in updates) updates.price = Number(updates.price);
    if ("stock" in updates) updates.stock = Number(updates.stock);
    if ("thumbnails" in updates) updates.thumbnails = normalizeThumbnails(updates.thumbnails);

    const updated = await Product.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );

    return formatProduct(updated);
  }

  async deleteProduct(id) {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) return false;

    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) return false;

    try {
      await Cart.updateMany(
        { "products.product": id },
        { $pull: { products: { product: id } } }
      );
    } catch (err) {
      console.error("Error actualizando carritos al borrar un producto:", err);
    }

    return true;
  }
}
