# Express Products API

A file-backed REST API built with Node.js and Express 5.

## Run locally

```sh
npm install
npm run dev
```

By default, the API listens on `http://localhost:3000`. Set `PORT` to use a different port.

## Endpoints

Successful responses use `{ "data": ... }`. Errors use `{ "error": { "message": ... } }`; product validation errors also include a `fields` object.

| Method | Path | Body | Success code | Error codes |
|---|---|---|---:|---|
| GET | `/api/health` | — | 200 | 500 |
| GET | `/api/products` | — | 200 | 500 |
| GET | `/api/products/:id` | — | 200 | 404, 500 |
| POST | `/api/products` | Required: `name`, `sku`, `category`, `price`, `stock` | 201 | 400, 422, 500 |
| PUT | `/api/products/:id` | Full replacement: all five product fields are required | 200 | 400, 404, 422, 500 |
| PATCH | `/api/products/:id` | One or more fields to change | 200 | 400, 404, 422, 500 |
| DELETE | `/api/products/:id` | — | 204 | 404, 500 |

`GET /api/products` accepts optional query parameters:

| Parameter | Description |
|---|---|
| `category` | Exact category match (case-insensitive). Allowed categories: `Home`, `Electronics`, `Accessories`, `Stationery`. |
| `q` | Case-insensitive substring search across product name, SKU, and category. |
| `sort` | `price` for ascending price or `-price` for descending price. |

Product fields: `name` (2–100 characters), `sku` (unique, pattern `^[A-Z]{3}-\d{4}$`), `category` (one of the allowed categories), `price` (number greater than 0), and `stock` (integer greater than or equal to 0). The API assigns `id` and `createdAt`.

## Examples

List products, search, and sort:

```sh
curl 'http://localhost:3000/api/products'
curl 'http://localhost:3000/api/products?category=Electronics&q=speaker'
curl 'http://localhost:3000/api/products?sort=-price'
```

Create a product (the response includes its ID and a `Location` header):

```sh
curl -i -X POST 'http://localhost:3000/api/products' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Desk Lamp",
    "sku": "LMP-1001",
    "category": "Home",
    "price": 44.95,
    "stock": 20
  }'
```

Get or update a product by ID:

```sh
curl 'http://localhost:3000/api/products/PRODUCT_ID'

# PUT replaces the editable fields; include all five fields.
curl -X PUT 'http://localhost:3000/api/products/PRODUCT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Desk Lamp",
    "sku": "LMP-1001",
    "category": "Home",
    "price": 49.95,
    "stock": 18
  }'

# PATCH changes only the supplied fields.
curl -X PATCH 'http://localhost:3000/api/products/PRODUCT_ID' \
  -H 'Content-Type: application/json' \
  -d '{ "stock": 16 }'
```

Delete a product (returns 204 with no body) or check health:

```sh
curl -i -X DELETE 'http://localhost:3000/api/products/PRODUCT_ID'
curl 'http://localhost:3000/api/health'
```

## VS Code REST Client

Open [requests.http](./requests.http) and use **Send Request** above a request. Run the `create` request before `updateProduct`, `patchProduct`, or `deleteProduct`; those requests reuse the created ID through the REST Client response reference.
