
---
# Blog Application - Full Stack Deployment on Azure Kubernetes Service

**Project Overview:** A full-stack blog application with React frontend and Node.js backend, deployed on Azure Kubernetes Service (AKS) with OpenID Connect authentication, HTTPS/SSL, and production-ready configurations.

## 🏗 System Architecture
* **Frontend**: React SPA served via Nginx (Port 80).
* **Backend**: Node.js Express REST API (Port 3001).
* **Container Registry**: Azure Container Registry (ACR).
* **Orchestration**: Azure Kubernetes Service (AKS).
* **Ingress**: Nginx Ingress Controller (Path-based routing).
* **Security**: Cert-manager with Let's Encrypt (Automated HTTPS).
* **Domain**: `quannv.id.vn`.

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
- [Phase 7: HTTPS & SSL Certificates](#phase-7-https--ssl-certificates)


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
- **Client Secret:** `cHJldmVudGJvdW5kYmF0dHJlZWV4cGxvcmVjZWxsbmVydm91c3ZhcG9ydGhhbnN0ZWU=`



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
OPENID_CLIENT_SECRET=cHJldmVudGJvdW5kYmF0dHJlZWV4cGxvcmVjZWxsbmVydm91c3ZhcG9ydGhhbnN0ZWU=
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


