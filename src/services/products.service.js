import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import HttpError from '../errors/HttpError.js';

const productsFile = fileURLToPath(new URL('../data/products.json', import.meta.url));
let writeQueue = Promise.resolve();

async function readProducts() {
  const contents = await readFile(productsFile, 'utf8');
  return JSON.parse(contents);
}

async function writeProducts(products) {
  const temporaryFile = `${productsFile}.${randomUUID()}.tmp`;

  try {
    await writeFile(temporaryFile, `${JSON.stringify(products, null, 2)}\n`, 'utf8');
    await rename(temporaryFile, productsFile);
  } catch (error) {
    try {
      await unlink(temporaryFile);
    } catch (cleanupError) {
      if (cleanupError.code !== 'ENOENT') {
        throw new AggregateError([error, cleanupError], 'Failed to write products file');
      }
    }
    throw error;
  }
}

function withSerializedWrite(operation) {
  const result = writeQueue.then(operation);
  writeQueue = result.then(() => undefined, () => undefined);
  return result;
}

function assertUniqueSku(products, sku, excludeId) {
  if (products.some((product) => product.sku === sku && product.id !== excludeId)) {
    throw new HttpError(422, 'Validation failed', { sku: 'must be unique' });
  }
}

export async function findProducts({ category, q, sort } = {}) {
  let products = await readProducts();

  if (typeof category === 'string' && category.trim()) {
    const normalizedCategory = category.trim().toLowerCase();
    products = products.filter((product) => product.category.toLowerCase() === normalizedCategory);
  }

  if (typeof q === 'string' && q.trim()) {
    const query = q.trim().toLowerCase();
    products = products.filter((product) =>
      [product.name, product.sku, product.category].some((value) => value.toLowerCase().includes(query)),
    );
  }

  if (sort === 'price' || sort === '-price') {
    const direction = sort === 'price' ? 1 : -1;
    products.sort((first, second) => direction * (first.price - second.price));
  }

  return products;
}

export async function findProductById(id) {
  const products = await readProducts();
  return products.find((product) => product.id === id) ?? null;
}

export async function isSkuTaken(sku, excludeId) {
  const products = await readProducts();
  return products.some((product) => product.sku === sku && product.id !== excludeId);
}

export async function createProduct(productData) {
  return withSerializedWrite(async () => {
    const products = await readProducts();
    assertUniqueSku(products, productData.sku);

    const product = {
      ...productData,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };

    await writeProducts([...products, product]);
    return product;
  });
}

export async function replaceProduct(id, productData) {
  return withSerializedWrite(async () => {
    const products = await readProducts();
    const index = products.findIndex((product) => product.id === id);
    if (index === -1) {
      return null;
    }

    assertUniqueSku(products, productData.sku, id);
    const product = { ...productData, id, createdAt: products[index].createdAt };
    products[index] = product;
    await writeProducts(products);
    return product;
  });
}

export async function patchProduct(id, changes) {
  return withSerializedWrite(async () => {
    const products = await readProducts();
    const index = products.findIndex((product) => product.id === id);
    if (index === -1) {
      return null;
    }

    const product = { ...products[index], ...changes };
    assertUniqueSku(products, product.sku, id);
    products[index] = product;
    await writeProducts(products);
    return product;
  });
}

export async function deleteProduct(id) {
  return withSerializedWrite(async () => {
    const products = await readProducts();
    const index = products.findIndex((product) => product.id === id);
    if (index === -1) {
      return false;
    }

    products.splice(index, 1);
    await writeProducts(products);
    return true;
  });
}
