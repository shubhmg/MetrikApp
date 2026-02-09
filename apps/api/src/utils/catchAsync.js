/**
 * Wraps an async route handler to catch errors and forward to Express error handler.
 */
export default function catchAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
