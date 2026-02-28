# Entrega #2 - Backend (Express + Handlebars + Socket.IO)

## Instalación

```bash
npm install
```

## Ejecución

```bash
npm start
```

Servidor: `http://localhost:8080`

## Vistas

- **Home**: `GET /`
  - Crea la lista completa de productos (almacenados en `src/data/products.json`).

- **Real Time Products**: `GET /realtimeproducts`
  - Crea la lista de productos y se actualiza en tiempo real por WebSocket.
  - Incluye formulario para crear productos y botón para eliminar.

## API

> Nota: las rutas `/api/products` y `/api/carts` requieren JWT (`Authorization: Bearer <token>`).

- **Auth**
  - `POST /api/login`
  - `POST /api/refresh`

- **Products** (`/api/products`)
  - `GET /`
  - `GET /:pid`
  - `POST /`
  - `PUT /:pid`
  - `DELETE /:pid`

- **Carts** (`/api/carts`)
  - `POST /` (crear carrito)
  - `GET /:cid`
  - `POST /:cid/product/:pid`

## Validaciones implementadas

- Campos requeridos al crear producto: `title`, `description`, `code`, `price`, `stock`, `category`.
- Tipos: `price` y `stock` numéricos (>= 0), `status` boolean.
- `code` único.
- `thumbnails` válido como array de strings (o string separado por comas).

## WebSocket (Socket.IO)

Eventos:

- `products` (server -> client): lista completa actualizada.
- `product:create` (client -> server): crea un producto y emite `products`.
- `product:delete` (client -> server): elimina un producto y emite `products`.

Adicionalmente, cuando se crean/actualizan/eliminan productos vía HTTP (`/api/products`), el servidor emite `products` para que la vista de `realtimeproducts` se actualice en tiempo real.
