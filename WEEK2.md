# Blog Application - Week 2: Production and Product Metrics setup

**Project Overview:** Implement production and product metrics for the blog application using Azure Application Insights and Google Analytics 4.

**Live Application:** https://quannv.id.vn

---

## Table of Contents

- [Overview](#overview)
- [: Production and Product Metrics setup](#Production and Product Metrics setup)
  - [Azure Application Insights Setup](#82-azure-application-insights-setup)
  - [Google Analytics 4 Setup](#83-google-analytics-4-setup)
  - [Accessing Metrics](#84-accessing-metrics)
  - [Azure Alerts Configuration](#85-azure-alerts-configuration)
  - [Testing and Verification](#86-testing-and-verification)
- [Documentation](#documentation)
  - [How to Access Metrics](#how-to-access-metrics)
- [Additional Resources](#additional-resources)

---

## Overview

This week focuses on implementing comprehensive monitoring and analytics for both production infrastructure (Azure Application Insights) and product usage (Google Analytics 4).

The application implements two complementary monitoring systems:
- **Azure Application Insights**: Production infrastructure and performance monitoring
- **Google Analytics 4**: Product analytics and user behavior tracking

**📊 Quick Access to Metrics**:
- **Azure Portal**: https://portal.azure.com → Search "Application Insights"
- **Google Analytics**: https://analytics.google.com → Property: G-RZ3H15V2B1
- **Detailed Access Instructions**: See [How to Access Metrics](#how-to-access-metrics) section

---

## Production and Product Metrics setup

### 8.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Blog Application                        │
│                                                             │
│  ┌─────────────────┐              ┌─────────────────┐       │
│  │    Frontend     │              │     Backend     │       │
│  │   React App     │              │   Express API   │       │
│  │                 │              │                 │       │
│  │  ┌──────────┐   │              │  ┌──────────┐   │       │
│  │  │ Google   │   │              │  │   App    │   │       │
│  │  │Analytics │   │              │  │ Insights │   │       │
│  │  │   (GA4)  │   │              │  │   SDK    │   │       │
│  │  └────┬─────┘   │              │  └────┬─────┘   │       │
│  └───────┼─────────┘              └───────┼─────────┘       │
│          │                                │                 │
└──────────┼────────────────────────────────┼─────────────────┘
           │                                │
           │                                │
           ▼                                ▼
  ┌────────────────┐              ┌────────────────────┐
  │  Google        │              │  Azure Application │
  │  Analytics 4   │              │     Insights       │
  │                │              │                    │
  │ • Page Views   │              │ • API Metrics      │
  │ • Events       │              │ • Performance      │
  │ • Sessions     │              │ • Errors/Logs      │
  │ • User Flow    │              │ • Dependencies     │
  └────────────────┘              │ • Alerts           │
                                  └────────────────────┘
```

---

### 8.2 Azure Application Insights Setup

**Purpose**: Monitor backend API performance, errors, dependencies, and custom metrics.

#### 8.2.1 Install Application Insights SDK

```bash
cd backend
npm install applicationinsights@^2.9.6
```

**Important**: Use v2.9.6 instead of v3.x to avoid OpenTelemetry crypto module issues in Alpine containers.

#### 8.2.2 Backend Integration

Create `backend/appInsights.js`:

```javascript
const appInsights = require('applicationinsights');

function initializeAppInsights() {
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  
  if (!connectionString) {
    console.warn('Application Insights connection string not found');
    return null;
  }

  appInsights.setup(connectionString)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true)
    .start();

  console.log('Application Insights initialized');
  return appInsights.defaultClient;
}

module.exports = { initializeAppInsights };
```

Update `backend/server.js`:

```javascript
const { initializeAppInsights } = require('./appInsights');
const appInsightsClient = initializeAppInsights();

// Custom metrics tracking
if (appInsightsClient) {
  app.use((req, res, next) => {
    const startTime = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      appInsightsClient.trackMetric({
        name: 'RequestDuration',
        value: duration
      });
    });
    next();
  });
}
```
#### 8.2.3 Deploy and Verify

```bash
# Rebuild and push backend
docker build -t blogapp.azurecr.io/blogapp-backend:latest ./backend
docker push blogapp.azurecr.io/blogapp-backend:latest

# Restart deployment
kubectl rollout restart deployment blog-backend

# Check logs
kubectl logs -l app=blog-backend --tail=50 | grep "Application Insights"
```

**Expected Output**:
```
Application Insights initialized
```

---

### 8.3 Google Analytics 4 Setup

**Purpose**: Track user interactions, page views, and product metrics.

#### 8.3.1 Create GA4 Property

1. Go to [Google Analytics](https://analytics.google.com)
2. Create new GA4 property
3. Get Measurement ID (format: `G-XXXXXXXXXX`)

#### 8.3.2 Frontend Integration

Add gtag.js snippet to `blog-frontend/public/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-RZ3H15V2B1"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-RZ3H15V2B1');
    </script>
    
    <meta charset="utf-8" />
    <!-- rest of head -->
  </head>
  <!-- rest of HTML -->
</html>
```

#### 8.3.3 Install React GA4 Package

```bash
cd blog-frontend
npm install react-ga4
```

Create `.env` file:

```
REACT_APP_GA_TRACKING_ID=G-RZ3H15V2B1
```

#### 8.3.4 Create Analytics Service

Create `blog-frontend/src/services/analytics.js`:

```javascript
import ReactGA from 'react-ga4';

export const initGA = () => {
  const trackingId = process.env.REACT_APP_GA_TRACKING_ID;
  if (trackingId) {
    ReactGA.initialize(trackingId);
    console.log('Google Analytics initialized with ID:', trackingId);
  } else {
    console.warn('GA tracking ID not found');
  }
};

```

#### 8.3.5 Integrate in React App

Update `blog-frontend/src/App.js`:

```javascript
import { initGA, trackPageView, trackEvent } from './services/analytics';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    initGA();
    trackPageView(window.location.pathname);
  }, []);

  // Track post views
  const handlePostClick = (post) => {
    trackEvent('Post', 'View', post.title, post.id);
    setSelectedPost(post);
  };

  // Rest of component...
}
```

#### 8.3.6 Deploy Updated Frontend

```bash
# Rebuild with analytics
docker build -t blogapp.azurecr.io/blogapp-frontend:latest ./blog-frontend
docker push blogapp.azurecr.io/blogapp-frontend:latest

# Restart deployment
kubectl rollout restart deployment blog-frontend
```

---

### 8.4 Accessing Metrics

This section provides direct access links and navigation instructions for both Azure Application Insights and Google Analytics 4.

#### 8.4.1 Application Insights (Production Metrics)

**Direct Access Links:**
- **Azure Portal**: https://portal.azure.com/?l=en.en-us#@mindx.com.vn/resource/subscriptions/f244cdf7-5150-4b10-b3f2-d4bff23c5f45/resourceGroups/mindx-intern-01-rg/providers/microsoft.insights/components/app_insight/overview
- **Application Insights Resource**: Navigate to `Home > Application Insights > mindx-intern-01-rg `
- **Quick Access**: Use Azure Portal search bar and type "Application Insights"



**Key Views**:

1. **Live Metrics**: Real-time monitoring
   - Navigate to: `Live Metrics`
   - View: Incoming requests, dependencies, exceptions
   - Use for: Live debugging, deployment verification

2. **Performance**: Request duration and throughput
   - Navigate to: `Investigate > Performance`
   - View: Operation duration, dependency calls
   - Filter by: Time range, operation name

3. **Failures**: Errors and exceptions
   - Navigate to: `Investigate > Failures`
   - View: Exception types, failed requests
   - Drill into: Stack traces, request details


#### 8.4.2 Google Analytics 4 (Product Metrics)

**Direct Access Links:**
- **Google Analytics**: https://analytics.google.com
- **Direct Property Access**: https://analytics.google.com/analytics/web/?authuser=1#/a383267235p523118767/reports/intelligenthome
- **My Property ID**: G-RZ3H15V2B1

**Key Reports**:

1. **Realtime**: Current active users
   - Navigate to: `Reports > Realtime`
   - View: Active users, events, page views
   - Use for: Deployment verification, live testing

2. **Engagement**: User interactions
   - Navigate to: `Reports > Engagement > Events`
   - View: Event count, users, conversions
   - Track: Likes, comments, searches

3. **User Acquisition**: Traffic sources
   - Navigate to: `Reports > Acquisition`
   - View: User source, medium, campaign
   - Analyze: Where users come from

4. **Pages and Screens**: Content performance
   - Navigate to: `Reports > Engagement > Pages and screens`
   - View: Page views, average time
   - Identify: Popular content


---

### 8.5 Azure Alerts Configuration

1. Go to: Application Insights > Alerts > New alert rule
2. Select scope: Your Application Insights resource
3. Add condition: Choose from templates or custom KQL query
4. Configure action group: Email, SMS, webhook, etc.
5. Define alert details: Name, severity, description
6. Create alert rule

---

### 8.6 Testing and Verification

**Azure Application Insights:**
- [ ] Backend logs appear in Live Metrics
- [ ] Request telemetry is collected
- [ ] Custom metrics (RequestDuration) are visible
- [ ] Alerts are configured and functioning

![Azure Application Insights - Live Metrics](images/image.png)
![Azure Application Insights - Performance](images/image-1.png)
![Azure Application Insights - Failures](images/image-3.png)
![Azure Application Insights - Logs](images/image-4.png)

**Google Analytics:**
- [ ] Page views are tracked
- [ ] Custom events appear in Realtime report
- [ ] User properties are set correctly
- [ ] Event parameters are captured
- [ ] Sessions and user counts are accurate

![Google Analytics - Realtime Report](images/image-5.png)
![Google Analytics - Events](images/image-2.png)

---

## Documentation

### How to Access Metrics

This section provides direct access links and step-by-step instructions to view production and product metrics.

**Quick Links**:
- 🔗 **Azure Portal**: https://portal.azure.com
- 🔗 **Application Insights**: Search "Application Insights" in Azure Portal
- 🔗 **Google Analytics 4**: https://analytics.google.com

---

#### Azure Application Insights


**Navigation Path**: 
```
Azure Portal → Home → Application Insights → mindx-intern-rg-01
```

**Quick Access Paths**:
1. **Real-time monitoring**: Live Metrics
   - URL: `https://portal.azure.com/#@mindx.com.vn/resource/subscriptions/f244cdf7-5150-4b10-b3f2-d4bff23c5f45/resourceGroups/mindx-intern-01-rg/providers/microsoft.insights/components/app_insight/quickPulse`
2. **Performance analysis**: Investigate → Performance
3. **Error tracking**: Investigate → Failures

**Common Queries**:
- Error rate over time
- Response time percentiles (P50, P95, P99)
- Request volume by endpoint
- Dependency call duration

#### Google Analytics 4

**Direct Access Links**:
- **GA4 Home**: https://analytics.google.com
- **Select Account**: https://analytics.google.com/analytics/web/
- **Property ID**: G-RZ3H15V2B1

**Navigation Path**:
```
analytics.google.com → Login → Select Account → Select Property (G-RZ3H15V2B1)
```

**Quick Access Paths**:
1. **Live users**: Reports → Realtime
   - Direct URL: `https://analytics.google.com/analytics/web/?authuser=1#/a383267235p523118767/reports/intelligenthome`

**Key Metrics**:
- Active users (1-day, 7-day, 28-day)
- Event count by type
- User engagement rate
- Session duration

---


### Documentation
- [Azure Application Insights Documentation](https://docs.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview)
- [Google Analytics 4 Documentation](https://support.google.com/analytics/answer/10089681)


### Learning Resources
- [Application Insights Tutorial](https://docs.microsoft.com/en-us/azure/azure-monitor/app/tutorial-runtime-exceptions)
- [GA4 Setup Guide](https://support.google.com/analytics/answer/9304153)


### Tools
- [Application Insights Profiler](https://docs.microsoft.com/en-us/azure/azure-monitor/profiler/profiler)
- [GA Debugger Chrome Extension](https://chrome.google.com/webstore/detail/google-analytics-debugger)

---

**Previous:** [Week 1: Deployment on AKS](WEEK1.md)
