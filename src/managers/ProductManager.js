import { promises as fs } from "fs";
import path from "path";

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

      return data;
    } catch (err) {
      await fs.writeFile(this.filePath, "[]", "utf-8");
      return [];
    }
  }


  async getProductById(id) {
    const products = await this.getProducts();
    return products.find(p => String(p.id) === String(id));
  }

  async addProduct(data) {
    const products = await this.getProducts();
    const id = products.length ? Number(products.at(-1).id) + 1 : 1;
    const product = { id, ...data };
    products.push(product);
    await fs.writeFile(this.filePath, JSON.stringify(products, null, 2));
    return product;
  }

  async updateProduct(id, data) {
    const products = await this.getProducts();
    const index = products.findIndex(p => String(p.id) === String(id));
    if (index === -1) return null;
    products[index] = { ...products[index], ...data, id: products[index].id };
    await fs.writeFile(this.filePath, JSON.stringify(products, null, 2));
    return products[index];
  }

  async deleteProduct(id) {
    const products = await this.getProducts();
    const filtered = products.filter(p => String(p.id) !== String(id));
    if (filtered.length === products.length) return false;

    await fs.writeFile(this.filePath, JSON.stringify(filtered, null, 2));

    if (this.cartsPath) {
      const cartsRaw = await fs.readFile(this.cartsPath, "utf-8");
      const carts = JSON.parse(cartsRaw);

      const updatedCarts = carts.map(cart => {
        const nextProducts = (cart.products || []).filter(
          item => String(item.product) !== String(id)
        );
        return { ...cart, products: nextProducts };
      });

      await fs.writeFile(this.cartsPath, JSON.stringify(updatedCarts, null, 2));
    }

    return true;
  }
}