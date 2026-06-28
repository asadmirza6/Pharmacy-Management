// Error Handler Middleware
// Translates database errors into user-friendly messages

function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Database connection errors
  if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      success: false,
      error: 'Database connection failed',
      message: 'Unable to connect to database. Please try again later.'
    });
  }

  // Foreign key constraint violation
  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete record',
      message: 'This record is referenced by other data and cannot be deleted.'
    });
  }

  // Duplicate entry
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      error: 'Duplicate entry',
      message: 'A record with this identifier already exists.'
    });
  }

  // Check constraint violation
  if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    return res.status(400).json({
      success: false,
      error: 'Invalid data',
      message: 'Data validation failed. Please check your input values.'
    });
  }

  // Generic error
  res.status(err.status || 500).json({
    success: false,
    error: 'Internal server error',
    message: err.message || 'An unexpected error occurred.'
  });
}

module.exports = errorHandler;
