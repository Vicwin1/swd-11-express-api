import HttpError from '../errors/HttpError.js';
import {
  createProduct as createProductRecord,
  deleteProduct as deleteProductRecord,
  findProductById,
  findProducts,
  patchProduct as patchProductRecord,
  replaceProduct as replaceProductRecord,
} from '../services/products.service.js';

export async function getProducts(req, res) {
  const products = await findProducts({
    category: req.query.category,
    q: req.query.q,
    sort: req.query.sort,
  });

  res.json({ data: products });
}

export async function getProduct(req, res) {
  const product = await findProductById(req.params.id);

  if (!product) {
    throw new HttpError(404, 'Product not found');
  }

  res.json({ data: product });
}

export async function createProduct(req, res) {
  const product = await createProductRecord(req.productData);
  res.location(`/api/products/${product.id}`).status(201).json({ data: product });
}

export async function replaceProduct(req, res) {
  const product = await replaceProductRecord(req.params.id, req.productData);

  if (!product) {
    throw new HttpError(404, 'Product not found');
  }

  res.json({ data: product });
}

export async function patchProduct(req, res) {
  const product = await patchProductRecord(req.params.id, req.productData);

  if (!product) {
    throw new HttpError(404, 'Product not found');
  }

  res.json({ data: product });
}

export async function deleteProduct(req, res) {
  const deleted = await deleteProductRecord(req.params.id);

  if (!deleted) {
    throw new HttpError(404, 'Product not found');
  }

  res.status(204).end();
}
