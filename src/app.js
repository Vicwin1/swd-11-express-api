import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import productsRouter from './routes/products.routes.js';
import HttpError from './errors/HttpError.js';

const app = express();
const publicDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), '../public');

app.use(express.json());

app.use((req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1_000_000;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration.toFixed(2)} ms`);
  });

  next();
});

app.use(express.static(publicDirectory));
app.use('/api/products', productsRouter);

app.get('/api/health', (req, res) => {
  res.json({ data: { status: 'ok', uptime: process.uptime() } });
});

app.use((req, res, next) => {
  next(new HttpError(404, 'Route not found'));
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const status = Number.isInteger(err.status) && err.status >= 400 && err.status <= 599
    ? err.status
    : Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode <= 599
      ? err.statusCode
      : 500;
  const message = status >= 500 ? 'Internal server error' : err.message;
  const error = { message };

  if (err.fields) {
    error.fields = err.fields;
  }

  if (process.env.NODE_ENV !== 'production' && err.stack) {
    error.stack = err.stack;
  }

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({ error });
});

export default app;
