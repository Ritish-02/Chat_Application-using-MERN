const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

const errorHandler = (err, req, res, next) => {
    // Use the error status code if it exists, otherwise fallback to 500
    const statusCode = err.statusCode || 500;
    
    // Ensure statusCode is a valid HTTP status code
    if (statusCode < 100 || statusCode > 599) {
        statusCode = 500;
    }
    
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === "production" ? null : err.stack
    });
};

module.exports = { notFound, errorHandler };
