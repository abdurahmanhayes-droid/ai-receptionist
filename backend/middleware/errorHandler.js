const { logger } = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Twilio webhook errors
  if (req.path.startsWith('/twilio')) {
    res.type('text/xml');
    return res.send(`
      <Response>
        <Say>We apologize, but we are experiencing technical difficulties. Please try again later.</Say>
        <Hangup/>
      </Response>
    `);
  }

  // API errors
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = { errorHandler };
