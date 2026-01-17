import express from "express";
import "dotenv/config";
import productsRouter from "./routes/products.js";
import cartsRouter from "./routes/carts.js";
import authRouter from "./routes/auth.js";

const app = express();
const PORT = 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/carts", cartsRouter);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});