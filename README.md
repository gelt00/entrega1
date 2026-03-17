# Entrega Final - Backend (Express + MongoDB + Handlebars + Socket.IO)

## Instalación

```bash
npm install
```

## Ejecución

```bash
npm start
```

Servidor: `http://localhost:8080`

MongoDB debe estar disponible con la URI configurada en `.env`.

## Vistas

- **Home**: `GET /`
  - Muestra la lista completa de productos almacenados en MongoDB.

- **Catalog**: `GET /products`
  - Muestra productos con paginación, filtros y ordenamiento.
  - Soporta `limit`, `page`, `sort`, `query` y `cart` por query string.

- **Product Detail**: `GET /products/:pid`
  - Muestra el detalle completo del producto y permite agregarlo a un carrito existente.

- **Cart Detail**: `GET /carts/:cid`
  - Muestra solo los productos asociados al carrito indicado.

- **Real Time Products**: `GET /realtimeproducts`
  - Muestra la lista de productos y se actualiza en tiempo real por WebSocket.
  - Incluye formulario para crear productos y botón para eliminar.

## Variables de entorno

Define estas variables en tu archivo `.env`:

```bash
JWT_ACCESS_SECRET=tu_secret
JWT_REFRESH_SECRET=tu_secret_refresh
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=1d
APP_USER=admin
APP_PASS=admin123
MONGO_URI=mongodb://usuario:password@localhost:27017/admin
```

## API

> Nota: las rutas `/api/products` y `/api/carts` requieren JWT (`Authorization: Bearer <token>`).

- **Auth**
  - `POST /api/login`
  - `POST /api/refresh`

- **Products** (`/api/products`)
  - `GET /`
    - Soporta `limit`, `page`, `sort=asc|desc` y `query`
    - `query` filtra por categoría o disponibilidad
  - `GET /:pid`
  - `POST /`
  - `PUT /:pid`
  - `DELETE /:pid`

- **Carts** (`/api/carts`)
  - `POST /` (crear carrito)
  - `GET /:cid`
  - `POST /:cid/product/:pid`
  - `PUT /:cid`
  - `PUT /:cid/products/:pid`
  - `DELETE /:cid/products/:pid`
  - `DELETE /:cid`

## Respuesta paginada de productos

`GET /api/products` devuelve:

```json
{
  "status": "success",
  "payload": [],
  "totalPages": 1,
  "prevPage": null,
  "nextPage": null,
  "page": 1,
  "hasPrevPage": false,
  "hasNextPage": false,
  "prevLink": null,
  "nextLink": null
}
```

## Validaciones implementadas

- Campos requeridos al crear producto: `title`, `description`, `code`, `price`, `stock`, `category`.
- Tipos: `price` y `stock` numéricos (>= 0), `status` boolean.
- `code` único.
- `thumbnails` válido como array de strings (o string separado por comas).
- En carritos, `quantity` debe ser entero mayor a `0`.
- Los IDs de productos dentro del carrito referencian documentos `Product` en MongoDB.

## WebSocket (Socket.IO)

Eventos:

- `products` (server -> client): lista completa actualizada.
- `product:create` (client -> server): crea un producto y emite `products`.
- `product:delete` (client -> server): elimina un producto y emite `products`.
- `product:toggle` (client -> server): cambia disponibilidad y emite `products`.

Adicionalmente, cuando se crean/actualizan/eliminan productos vía HTTP (`/api/products`), el servidor emite `products` para que la vista de `realtimeproducts` se actualice en tiempo real.
