/**
 * Request logger middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const { method, url } = req;
  
  // Log when request is received
  console.log(`[${new Date().toISOString()}] ${method} ${url} - Request received`);
  
  // Log when response is sent
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${method} ${url} - Response sent: ${res.statusCode} (${duration}ms)`);
  });
  
  next();
};

module.exports = requestLogger;