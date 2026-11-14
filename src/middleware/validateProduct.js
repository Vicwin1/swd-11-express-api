import HttpError from '../errors/HttpError.js';
import { isSkuTaken } from '../services/products.service.js';

const productFields = ['name', 'sku', 'category', 'price', 'stock'];
const categories = ['Home', 'Electronics', 'Accessories', 'Stationery'];
const requiredMethods = new Set(['POST', 'PUT']);

export async function validateProduct(req, res, next) {
  const body = req.body;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(422, 'Validation failed', { body: 'must be a JSON object' });
  }

  const fields = {};
  const suppliedFields = Object.keys(body);

  for (const field of suppliedFields) {
    if (!productFields.includes(field)) {
      fields[field] = 'is not allowed';
    }
  }

  if (req.method === 'PATCH' && suppliedFields.length === 0) {
    fields.body = 'must include at least one product field';
  }

  for (const field of productFields) {
    const value = body[field];

    if (requiredMethods.has(req.method) && !Object.hasOwn(body, field)) {
      fields[field] = 'is required';
      continue;
    }

    if (!Object.hasOwn(body, field)) {
      continue;
    }

    switch (field) {
      case 'name':
        if (typeof value !== 'string' || value.trim().length < 2 || value.trim().length > 100) {
          fields.name = 'must be a string between 2 and 100 characters';
        }
        break;
      case 'sku':
        if (typeof value !== 'string' || !/^[A-Z]{3}-\d{4}$/.test(value)) {
          fields.sku = 'must match the pattern AAA-0000';
        }
        break;
      case 'category':
        if (typeof value !== 'string' || !categories.includes(value)) {
          fields.category = `must be one of: ${categories.join(', ')}`;
        }
        break;
      case 'price':
        if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
          fields.price = 'must be a number greater than 0';
        }
        break;
      case 'stock':
        if (!Number.isInteger(value) || value < 0) {
          fields.stock = 'must be an integer greater than or equal to 0';
        }
        break;
    }
  }

  if (typeof body.sku === 'string' && /^[A-Z]{3}-\d{4}$/.test(body.sku)) {
    const excludeId = req.params.id;
    if (await isSkuTaken(body.sku, excludeId)) {
      fields.sku = 'must be unique';
    }
  }

  if (Object.keys(fields).length) {
    throw new HttpError(422, 'Validation failed', fields);
  }

  req.productData = Object.fromEntries(
    productFields
      .filter((field) => Object.hasOwn(body, field))
      .map((field) => [field, field === 'name' ? body[field].trim() : body[field]]),
  );
  next();
}
