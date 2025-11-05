function notFound(req, res, next) {
  res.status(404).json({ message: 'Route not found' });
}

function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'Server error';
  if (process.env.NODE_ENV !== 'production') {
    // minimal debug info in non-prod
    return res.status(status).json({ message, stack: err.stack });
  }
  return res.status(status).json({ message });
}

module.exports = { notFound, errorHandler };


