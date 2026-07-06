// Wrap an async route handler so rejected promises reach the error middleware.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Central error handler.
export function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || 'Internal Server Error' });
}

// 404 fallback for unknown /api routes.
export function notFound(req, res) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
}
