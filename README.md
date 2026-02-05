
---
# Blog Application - Full Stack Deployment on Azure Kubernetes Service

**Project Overview:** A full-stack blog application with React frontend and Node.js backend, deployed on Azure Kubernetes Service (AKS) with OpenID Connect authentication, HTTPS/SSL, and production-ready configurations.

**Live Application:** https://quannv.id.vn

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Phase 1: Containerization & Azure Container Registry](#phase-1-containerization--azure-container-registry)
- [Phase 2: Azure Kubernetes Service Setup](#phase-2-azure-kubernetes-service-setup)
- [Phase 3: Backend API Deployment](#phase-3-backend-api-deployment)
- [Phase 4: Frontend Application Deployment](#phase-4-frontend-application-deployment)
- [Phase 5: Ingress Configuration](#phase-5-ingress-configuration)
- [Phase 6: OpenID Connect Authentication](#phase-6-openid-connect-authentication)
- [Phase 7: HTTPS & SSL Certificates](#Phase-7-HTTPS-SSL-Certificates)
- [Phase 8: Monitoring & Analytics](#phase-8-monitoring--analytics)

---

## Architecture Overview

```
                                    ┌─────────────────┐
                                    │   Users/Clients │
                                    └────────┬────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │  Custom Domain  │
                                    │ quannv.id.vn    │
                                    │   (HTTPS/SSL)   │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │           Azure Kubernetes Service (AKS)        │
                    │                                                  │
                    │         ┌──────────────────────┐                │
                    │         │  NGINX Ingress       │                │
                    │         │  Controller          │                │
                    │         │  - SSL Termination   │                │
                    │         │  - Routing Rules     │                │
                    │         └──────┬──────┬────────┘                │
                    │                │      │                          │
                    │       ┌────────┘      └────────┐                │
                    │       ▼                         ▼                │
                    │  ┌─────────────┐         ┌─────────────┐       │
                    │  │  Frontend   │         │   Backend   │       │
                    │  │  Service    │         │   Service   │       │
                    │  │  (ClusterIP)│         │  (ClusterIP)│       │
                    │  └──────┬──────┘         └──────┬──────┘       │
                    │         │                       │               │
                    │         ▼                       ▼               │
                    │  ┌─────────────┐         ┌─────────────┐       │
                    │  │  Frontend   │         │   Backend   │       │
                    │  │  Pods (x2)  │         │   Pods (x2) │       │
                    │  │  React App  │         │  Node.js API│       │
                    │  │  Nginx:8080 │         │  Express    │       │
                    │  └─────────────┘         └──────┬──────┘       │
                    │                                 │               │
                    └─────────────────────────────────┼───────────────┘
                                                      │
                                                      ▼
                                            ┌──────────────────┐
                                            │  MindX OpenID    │
                                            │  Auth Server     │
                                            │ id-dev.mindx.vn  │
                                            └──────────────────┘

External Services:
- Azure Container Registry (ACR): blogapp.azurecr.io
- Let's Encrypt: SSL Certificate Authority
- Cert-Manager: Automatic certificate management
```

---

## Tech Stack

### Frontend
- **React** 18.x - UI framework
- **Lucide React** - Icon library
- **CSS** - Custom styling

### Backend
- **Node.js** 18.x - Runtime environment
- **Express** 4.x - Web framework
- **CORS** - Cross-origin resource sharing
- **node-fetch** - HTTP client for OpenID

### Infrastructure
- **Azure Kubernetes Service (AKS)** - Container orchestration
- **Azure Container Registry (ACR)** - Container image storage
- **NGINX Ingress Controller** - Traffic routing & load balancing
- **Cert-Manager** - SSL certificate management
- **Let's Encrypt** - Free SSL certificates

### Authentication
- **OpenID Connect** - Authentication protocol
- **MindX Identity Server** - OpenID provider

### DevOps
- **Docker** - Containerization
- **kubectl** - Kubernetes CLI
- **Azure CLI** - Azure management

---

## Prerequisites

### Required Tools
```bash
# Docker Desktop
docker --version
# Output: Docker version 24.x.x

# Azure CLI
az --version
# Output: azure-cli 2.x.x

# kubectl
kubectl version --client
# Output: Client Version: v1.x.x

# Node.js (for local development)
node --version
# Output: v18.x.x or higher
```

### Azure Access
- Azure subscription with Contributor/Owner role
- Access to create:
  - Resource Groups
  - Azure Container Registry (ACR)
  - Azure Kubernetes Service (AKS)
  - Network Security Groups (NSG)

### Domain & DNS
- Custom domain (or subdomain)
- DNS management access

---

## Phase 1: Containerization & Azure Container Registry

### 1.1 Project Structure Setup

```bash
blogapp/
├── backend/
│   ├── server.js           # Express API server
│   ├── package.json
│   ├── package-lock.json
│   └── Dockerfile          # Backend container config
├── frontend/
│   ├── src/
│   │   ├── App.js         # React main component
│   │   └── App.css
│   ├── public/
│   ├── package.json
│   ├── nginx.conf         # Nginx configuration
│   └── Dockerfile         # Frontend container config
└── k8s/
    ├── backend-deployment.yaml
    ├── frontend-deployment.yaml
    ├── backend-service.yaml
    ├── frontend-service.yaml
    └── ingress.yaml
```

### 1.2 Backend Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY server.js ./

EXPOSE 3001

CMD ["node", "server.js"]
```

**Key Points:**
- Uses Alpine Linux for smaller image size
- Copies dependencies first for layer caching
- Exposes port 3001 for API

### 1.3 Frontend Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY public ./public
COPY src ./src

RUN npm run build

# Production stage
FROM nginx:alpine

# Create cache directories with proper permissions
RUN mkdir -p /var/cache/nginx/client_temp \
    /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp \
    /var/cache/nginx/uwsgi_temp \
    /var/cache/nginx/scgi_temp && \
    chmod -R 777 /var/cache/nginx && \
    chmod -R 777 /var/run

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built app from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
```

**Key Points:**
- Multi-stage build reduces final image size
- Nginx serves static React files
- Port 8080 (non-root user compatibility)


### 1.4 Create Azure Container Registry

```bash
# Login to Azure
az login

# Create resource group
az group create \
  --name mindx-intern-01-rg \
  --location eastasia

# Create Azure Container Registry
az acr create \
  --resource-group mindx-intern-01-rg \
  --name blogapp \
  --sku Basic

# Login to ACR
az acr login --name blogapp
```

**Expected Output:**
```
Login Succeeded
```

### 1.6 Build and Push Container Images

```bash

docker-compose build
docker-compose up 
# Build backend image

docker build -t blogapp.azurecr.io/blogapp-backend:latest ./backend

# Build frontend image

docker build -t blogapp.azurecr.io/blogapp-frontend:latest ./blog-frontend

# Push images to ACR
docker push blogapp.azurecr.io/blogapp-backend:latest
docker push blogapp.azurecr.io/blogapp-frontend:latest
```

**Verify images in ACR:**
```bash
az acr repository list --name blogapp --output table
```

**Expected Output:**
```
Result
----------------
blogapp-backend
blogapp-frontend
```

---

## Phase 2: Azure Kubernetes Service Setup

### 2.1 Create AKS Cluster

```bash
# Create AKS cluster
az aks create \
  --resource-group mindx-intern-01-rg \
  --name mindx-aks-cluster \
  --node-count 2 \
  --enable-addons monitoring \
  --generate-ssh-keys \
  --attach-acr blogapp

# Get AKS credentials
az aks get-credentials \
  --resource-group mindx-intern-01-rg \
  --name mindx-aks-cluster
```

**Verify cluster connection:**
```bash
kubectl cluster-info
kubectl get nodes
```

**Expected Output:**
```
NAME                                STATUS   ROLES   AGE   VERSION
aks-nodepool1-33561299-vmss000000   Ready    agent   1d    v1.28.x
aks-nodepool1-33561299-vmss000001   Ready    agent   1d    v1.28.x
```

### 2.2 Install NGINX Ingress Controller

```bash
# Add NGINX Ingress Helm repository
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install NGINX Ingress Controller
helm install nginx-ingress ingress-nginx/ingress-nginx \
  --create-namespace \
  --namespace ingress-nginx \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-health-probe-request-path"=/healthz
```

**Verify ingress controller:**
```bash
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

**Expected Output:**
```
NAME                                               TYPE           EXTERNAL-IP      PORT(S)
nginx-ingress-ingress-nginx-controller             LoadBalancer   20.255.125.147   80:30530/TCP,443:30886/TCP
```

**Important:** Note the EXTERNAL-IP - this is your ingress IP address.

### 2.3 Configure ACR Authentication

```bash
# Get ACR credentials
az acr credential show --name blogapp

# Create Kubernetes secret
kubectl create secret docker-registry acr-secret \
  --docker-server=blogapp.azurecr.io \
  --docker-username=blogapp \
  --docker-password="<password-from-previous-command>"

# Verify secret
kubectl get secret acr-secret
```

---

## Phase 3: Backend API Deployment



### 3.1 Deploy Backend

```bash
# Apply backend deployment and service
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml

# Check deployment status
kubectl get deployments
kubectl get pods -l app=blog-backend
kubectl get svc blog-backend

# View logs
kubectl logs -l app=blog-backend --tail=50
```

**Expected Output:**
```
NAME           READY   UP-TO-DATE   AVAILABLE   AGE
blog-backend   2/2     2            2           1m

NAME                           READY   STATUS    RESTARTS   AGE
blog-backend-8684446bd-lc8k8   1/1     Running   0          1m
blog-backend-8684446bd-qtgv9   1/1     Running   0          1m
```

---

## Phase 4: Frontend Application Deployment

### 4.1 Frontend API Configuration

**Important:** Update `frontend/src/App.js` to use API path:

```javascript
// Change from:
const API_URL = 'http://localhost:3001';

// To:
const API_URL = '';  // Empty string for relative paths

// Update all API calls to include /api prefix:
fetch(`${API_URL}/api/posts`)      
fetch(`${API_URL}/api/health`)     
fetch(`${API_URL}/api/auth/login`) 
```

### 4.2 Rebuild Frontend with API Changes

```bash

# Rebuild Docker image
docker build -t blogapp.azurecr.io/blogapp-frontend:latest ./blog-frontend

# Push to ACR
docker push blogapp.azurecr.io/blogapp-frontend:latest
```

### 4.3 Deploy Frontend

```bash
# Apply frontend deployment and service
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml

# Check deployment
kubectl get deployments
kubectl get pods -l app=blog-frontend
kubectl get svc blog-frontend
```

---

## Phase 5: Ingress Configuration


### 5.1 Deploy Ingress

```bash
# Apply ingress
kubectl apply -f k8s/ingress.yaml

# Check ingress
kubectl get ingress
kubectl describe ingress blog-ingress
```

**Expected Output:**
```
NAME           CLASS   HOSTS          ADDRESS          PORTS   AGE
blog-ingress   nginx   quannv.id.vn   20.255.125.147   80      1m
```

### 5.3 Test Application (Before DNS)

```bash
# Test using IP address
curl http://20.255.125.147/api/health
curl http://20.255.125.147/api/posts

# Open in browser
# http://20.255.125.147/
```

---

## Phase 6: OpenID Connect Authentication

### 6.1 OpenID Provider Information

**MindX OpenID Configuration:**
- **Issuer:** `https://id-dev.mindx.edu.vn`
- **Authorization Endpoint:** `https://id-dev.mindx.edu.vn/auth`
- **Token Endpoint:** `https://id-dev.mindx.edu.vn/token`
- **UserInfo Endpoint:** `https://id-dev.mindx.edu.vn/me`
- **Client ID:**  `mindx-onboarding`
- **Client Secret:** 



### 6.2 Backend OpenID Configuration

Update `backend/server.js`:

```javascript
const OPENID_CONFIG = {
  issuer: 'https://id-dev.mindx.edu.vn',
  authorizationEndpoint: 'https://id-dev.mindx.edu.vn/auth',
  tokenEndpoint: 'https://id-dev.mindx.edu.vn/token',
  userInfoEndpoint: 'https://id-dev.mindx.edu.vn/me',
  clientId: process.env.OPENID_CLIENT_ID 
  clientSecret: process.env.OPENID_CLIENT_SECRET 
  redirectUri: process.env.OPENID_REDIRECT_URI
  scope: 'openid profile email'
};
```
Update `.env`:

```plaintext
OPENID_CLIENT_ID=mindx-onboarding
OPENID_CLIENT_SECRET=
OPENID_REDIRECT_URI=https://quannv.id.vn/api/auth/callback 
```
### 6.3 Create OpenID Secret

```bash
kubectl create secret generic blog-backend-openid \
  --from-literal=OPENID_CLIENT_ID='' \
  --from-literal=OPENID_CLIENT_SECRET='=' \
  --from-literal=OPENID_REDIRECT_URI='https://quannv.id.vn/api/auth/callback'

# Verify secret
kubectl get secret blog-backend-openid
```

### 6.4 Redeploy Backend with OpenID

```bash
# Rebuild backend with OpenID config
cd backend
docker build -t blogapp.azurecr.io/blogapp-backend:latest .
docker push blogapp.azurecr.io/blogapp-backend:latest

# Restart deployment
kubectl rollout restart deployment blog-backend

# Check status
kubectl get pods -l app=blog-backend
```

### 6.5 Register Redirect URI with MindX

**Contact Mrs. Duyen to add redirect URI:**

```

Redirect URI: https://quannv.id.vn/api/auth/callback

Client ID: mindx-onboarding
```

### 6.6 Authentication Flow

1.  **Initiate Login**: Frontend requests a login URL from the Backend, which then redirects the user to the MindX Identity Server (IdP).
2.  **User Authentication**: The user authenticates and grants consent on the IdP's page.
3.  **Authorization Code**: The IdP redirects back to the application's configured `redirect_uri` with an authorization `code`.
4.  **Token Exchange**: The Backend exchanges this `code` with the IdP for an `access_token` and `id_token`.
5.  **UserInfo Fetch**: The Backend uses the `access_token` to call the UserInfo endpoint (`/me`) to retrieve complete user profile including email, name, and other claims.
6.  **Session Management**: The Backend creates an in-memory session for the user, returning a `sessionToken` and enriched user details to the Frontend.
7.  **Authenticated Access**: The Frontend stores the `sessionToken` and uses it to authorize subsequent API calls.
8.  **Logout**: On logout, the session is invalidated both in the Frontend and Backend.

**Key Implementation Details:**
```javascript
// Backend fetches additional user claims from UserInfo endpoint
const userInfoResponse = await fetch('https://id-dev.mindx.edu.vn/me', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
const userInfo = await userInfoResponse.json();

// Combines ID token claims with UserInfo for complete profile
const user = {
  id: idTokenPayload.sub,
  email: userInfo.email || idTokenPayload.email,
  name: createDisplayName(userInfo),
  ...userInfo
};
```

---

## Phase 7: HTTPS & SSL Certificates

### 7.1 DNS Configuration

**Configure DNS A Record:**

| Type | Name      | Value          | TTL  |
|------|-----------|----------------|------|
| A    | quannv    | 20.255.125.147 | 300  |

**Verify DNS:**
```bash
nslookup quannv.id.vn
```

### 7.2 Install Cert-Manager

```bash
# Add Jetstack Helm repository
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Install cert-manager
kubectl create namespace cert-manager
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --version v1.13.0 \
  --set installCRDs=true

# Verify installation
kubectl get pods -n cert-manager
```

### 7.3 Create ClusterIssuer for Let's Encrypt


```bash
kubectl apply -f k8s/letsencrypt-prod.yaml
```


```bash
# Apply updated ingress
kubectl apply -f k8s/ingress.yaml

# Check certificate status
kubectl get certificate
kubectl describe certificate blog-tls-cert
```

**Expected Output:**
```
NAME            READY   SECRET          AGE
blog-tls-cert   True    blog-tls-cert   1m
```

### 7.5 Verify HTTPS

```bash
# Test HTTPS
curl https://quannv.id.vn/api/health
curl https://quannv.id.vn/api/posts

# Check certificate details
kubectl describe certificate blog-tls-cert
```

**Open in browser:**
```
https://quannv.id.vn
```

You should see:
- Valid SSL certificate (green padlock)
- Blog application loads
- Login functionality works

---

## Phase 8: Monitoring & Analytics

### 8.1 Overview

The application implements two complementary monitoring systems:
- **Azure Application Insights**: Production infrastructure and performance monitoring
- **Google Analytics 4**: Product analytics and user behavior tracking

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

#### 8.2.3 Create Application Insights Secret

```bash
# Get connection string from Azure Portal
# Navigate to: Application Insights > Overview > Connection String

kubectl create secret generic blog-backend-appinsights \
  --from-literal=APPLICATIONINSIGHTS_CONNECTION_STRING='InstrumentationKey=...;IngestionEndpoint=...'

# Verify secret
kubectl get secret blog-backend-appinsights
```

#### 8.2.4 Update Backend Deployment

Update `k8s/backend/deployment.yaml`:

```yaml
env:
  - name: APPLICATIONINSIGHTS_CONNECTION_STRING
    valueFrom:
      secretKeyRef:
        name: blog-backend-appinsights
        key: APPLICATIONINSIGHTS_CONNECTION_STRING
```

#### 8.2.5 Deploy and Verify

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

export const trackPageView = (path) => {
  ReactGA.send({ hitType: 'pageview', page: path });
  console.log('GA Page View:', path);
};

export const trackEvent = (category, action, label = '', value = 0) => {
  ReactGA.event({
    category,
    action,
    label,
    value
  });
  console.log('GA Event:', { category, action, label, value });
};

export const trackTiming = (category, variable, value, label = '') => {
  ReactGA.event({
    category,
    action: 'timing_complete',
    label: `${variable}: ${label}`,
    value: Math.round(value)
  });
};

export const setUserProperties = (userId, properties = {}) => {
  ReactGA.set({ userId, ...properties });
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

  // Track likes
  const handleLike = async (postId) => {
    await likePost(postId);
    trackEvent('Engagement', 'Like', `Post ${postId}`);
  };

  // Track comments
  const handleComment = async (postId, content) => {
    await addComment(postId, content);
    trackEvent('Engagement', 'Comment', `Post ${postId}`);
  };

  // Track search
  const handleSearch = (query) => {
    setSearchQuery(query);
    trackEvent('Search', 'Query', query);
  };

  // Rest of component...
}
```

Update `blog-frontend/src/contexts/AuthContext.js`:

```javascript
import { trackEvent, setUserProperties } from '../services/analytics';

const login = async () => {
  const response = await fetch('/api/auth/callback', {
    method: 'POST',
    body: JSON.stringify({ code })
  });
  const data = await response.json();
  
  setUser(data.user);
  setUserProperties(data.user.id, {
    user_name: data.user.name,
    user_email: data.user.email
  });
  trackEvent('Auth', 'Login', data.user.email);
};

const logout = () => {
  trackEvent('Auth', 'Logout', user?.email || 'unknown');
  setUser(null);
};
```

#### 8.3.6 Deploy Updated Frontend

```bash
# Rebuild with analytics
docker build -t blogapp.azurecr.io/blogapp-frontend:latest ./blog-frontend
docker push blogapp.azurecr.io/blogapp-frontend:latest

# Restart deployment
kubectl rollout restart deployment blog-frontend
```

### 8.4 Accessing Metrics

#### 8.4.1 Application Insights (Production Metrics)

**Access**: Azure Portal > Application Insights > Your Resource

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

4. **Logs**: KQL queries
   - Navigate to: `Monitoring > Logs`
   - Query language: Kusto Query Language (KQL)

**Sample KQL Queries**:

```kql
// Request count by endpoint
requests
| where timestamp > ago(24h)
| summarize count() by name
| order by count_ desc

// Average response time
requests
| where timestamp > ago(1h)
| summarize avg(duration) by bin(timestamp, 5m)
| render timechart

// Error rate
requests
| where timestamp > ago(24h)
| summarize 
    total = count(),
    errors = countif(success == false)
| extend errorRate = (errors * 100.0) / total

// Custom metrics
customMetrics
| where name == "RequestDuration"
| summarize avg(value), percentiles(value, 50, 95, 99) by bin(timestamp, 5m)
| render timechart

// Dependencies (external API calls)
dependencies
| where timestamp > ago(1h)
| summarize count(), avg(duration) by target
| order by count_ desc
```

#### 8.4.2 Google Analytics 4 (Product Metrics)

**Access**: [analytics.google.com](https://analytics.google.com) > Your Property

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

**Custom Event Analysis**:

1. Navigate to: `Explore > Free Form`
2. Add dimensions: `Event name`, `Event label`
3. Add metrics: `Event count`, `Total users`
4. Filter by: Date range, user properties

**Tracked Events**:
- `Auth.Login` - User login
- `Auth.Logout` - User logout
- `Post.View` - Post detail view
- `Engagement.Like` - Post like action
- `Engagement.Comment` - Comment submission
- `Search.Query` - Search usage

### 8.5 Azure Alerts Configuration

#### 8.5.1 Create Alert Rules


  - name: High Error Rate
    description: Alert when error rate exceeds 5%
    severity: 2
    query: |
      requests
      | where timestamp > ago(5m)
      | summarize 
          total = count(),
          errors = countif(success == false)
      | extend errorRate = (errors * 100.0) / total
      | where errorRate > 5
    frequency: PT5M
    timeWindow: PT5M
    actions:
      - email: quannv@example.com

  - name: Slow Response Time
    description: Alert when P95 response time exceeds 2 seconds
    severity: 3
    query: |
      requests
      | where timestamp > ago(5m)
      | summarize p95 = percentile(duration, 95)
      | where p95 > 2000
    frequency: PT5M
    timeWindow: PT5M

  - name: High Memory Usage
    description: Alert when memory usage exceeds 80%
    severity: 2
    metric: performanceCounters/memoryAvailableBytes
    operator: LessThan
    threshold: 200000000
    frequency: PT5M


#### 8.5.2 Deploy Alerts

Create `monitoring/deploy-alerts.sh`:

```bash
#!/bin/bash

RESOURCE_GROUP="mindx-intern-01-rg"
APP_INSIGHTS_NAME="blogapp"
ACTION_GROUP="blogapp-alerts-action-group"

# Create action group for notifications
az monitor action-group create \
  --name $ACTION_GROUP \
  --resource-group $RESOURCE_GROUP \
  --short-name "BlogAlert" \
  --email-receiver "admin" "quannv@example.com"

# Create alert rules
az monitor scheduled-query create \
  --name "High-Error-Rate" \
  --resource-group $RESOURCE_GROUP \
  --scopes "/subscriptions/<subscription-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Insights/components/$APP_INSIGHTS_NAME" \
  --condition "count 'Placeholder' > 0" \
  --condition-query "requests | where timestamp > ago(5m) | summarize total = count(), errors = countif(success == false) | extend errorRate = (errors * 100.0) / total | where errorRate > 5" \
  --description "Alert when error rate exceeds 5%" \
  --evaluation-frequency 5m \
  --window-size 5m \
  --severity 2 \
  --action-groups "/subscriptions/<subscription-id>/resourceGroups/$RESOURCE_GROUP/providers/microsoft.insights/actionGroups/$ACTION_GROUP"
```

### 8.6 Testing and Verification

#### 8.6.1 Test Application Insights

Create `monitoring/test-analytics.ps1`:

```powershell
# Test backend API and verify telemetry
$baseUrl = "https://quannv.id.vn"

Write-Host "Testing Application Insights integration..." -ForegroundColor Cyan

# 1. Health check
$health = Invoke-RestMethod -Uri "$baseUrl/api/health"
Write-Host "Health: $($health | ConvertTo-Json)" -ForegroundColor Green

# 2. Generate test traffic
for ($i = 1; $i -le 10; $i++) {
    $posts = Invoke-RestMethod -Uri "$baseUrl/api/posts"
    Write-Host "Request $i: Retrieved $($posts.Length) posts"
    Start-Sleep -Milliseconds 500
}

# 3. Test error scenario (optional)
try {
    Invoke-RestMethod -Uri "$baseUrl/api/invalid-endpoint"
} catch {
    Write-Host "Expected 404 error logged" -ForegroundColor Yellow
}

Write-Host "`nCheck Application Insights in Azure Portal:" -ForegroundColor Cyan
Write-Host "1. Go to Application Insights > Live Metrics"
Write-Host "2. Verify incoming requests appear"
Write-Host "3. Check custom metric 'RequestDuration'"
```

#### 8.6.2 Test Google Analytics

```powershell
Write-Host "Testing Google Analytics integration..." -ForegroundColor Cyan

# Open application in browser
Start-Process "https://quannv.id.vn"

Write-Host "`nManual verification steps:" -ForegroundColor Yellow
Write-Host "1. Open browser DevTools (F12)"
Write-Host "2. Go to Network tab"
Write-Host "3. Filter by 'google-analytics' or 'g/collect'"
Write-Host "4. Perform actions (view post, like, comment)"
Write-Host "5. Verify POST requests to google-analytics.com/g/collect"
Write-Host ""
Write-Host "Check Google Analytics:" -ForegroundColor Cyan
Write-Host "1. Go to analytics.google.com"
Write-Host "2. Select your property (G-RZ3H15V2B1)"
Write-Host "3. Navigate to Realtime report"
Write-Host "4. Verify active users and events"
```


## Additional Resources

### Official Documentation
- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Azure Kubernetes Service (AKS)](https://docs.microsoft.com/en-us/azure/aks/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [Cert-Manager](https://cert-manager.io/docs/)
- [Let's Encrypt](https://letsencrypt.org/docs/)

### Learning Resources
- [Kubernetes Basics Tutorial](https://kubernetes.io/docs/tutorials/kubernetes-basics/)
- [Docker for Beginners](https://docker-curriculum.com/)
- [Azure Learning Paths](https://docs.microsoft.com/en-us/learn/azure/)

### Tools
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Docker Cheat Sheet](https://docs.docker.com/get-started/docker_cheatsheet.pdf)
- [Lens - Kubernetes IDE](https://k8slens.dev/)


