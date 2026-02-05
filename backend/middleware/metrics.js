const { getClient } = require('../appInsights');

// Track request metrics
const trackRequestMetrics = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const client = getClient();
    
    if (!client) return;
    
    // Track request duration
    client.trackMetric({
      name: 'RequestDuration',
      value: duration,
      properties: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        userId: req.user?.id || 'anonymous'
      }
    });
    
    // Track request event
    client.trackEvent({
      name: 'API Request',
      properties: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        userId: req.user?.id || 'anonymous',
        userAgent: req.headers['user-agent']
      }
    });
    
    // Track slow requests (> 2 seconds)
    if (duration > 2000) {
      client.trackEvent({
        name: 'Slow Request',
        properties: {
          method: req.method,
          path: req.path,
          duration,
          severity: 'warning'
        }
      });
    }
  });
  
  next();
};

// Track custom events
const trackEvent = (name, properties = {}) => {
  const client = getClient();
  if (client) {
    client.trackEvent({ name, properties });
  }
};

// Track exceptions
const trackException = (error, properties = {}) => {
  const client = getClient();
  if (client) {
    client.trackException({
      exception: error,
      properties,
      severityLevel: properties.severity || 'Error'
    });
  }
};

// Track custom metrics
const trackMetric = (name, value, properties = {}) => {
  const client = getClient();
  if (client) {
    client.trackMetric({ name, value, properties });
  }
};

module.exports = {
  trackRequestMetrics,
  trackEvent,
  trackException,
  trackMetric
};
