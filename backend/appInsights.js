const appInsights = require('applicationinsights');

let client = null;

const setupAppInsights = () => {
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  
  if (!connectionString) {
    console.warn('⚠️ App Insights connection string not found. Metrics disabled.');
    return null;
  }

  appInsights.setup(connectionString)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true, true)
    .setUseDiskRetryCaching(true)
    .setSendLiveMetrics(true)
    .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C)
    .start();

  client = appInsights.defaultClient;
  
  console.log('✅ Azure App Insights initialized');
  return client;
};

const getClient = () => client;

module.exports = { setupAppInsights, getClient };
