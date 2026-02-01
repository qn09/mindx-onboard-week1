# Full-Stack Blog Application on Azure Kubernetes Service (AKS)

This repository contains a professional full-stack blog application featuring a **Node.js Express API** and a **React Frontend**. The project follows a modern DevOps workflow, utilizing containerization, cloud-native orchestration, and automated security.



## 🏗 System Architecture
* **Frontend**: React SPA served via Nginx (Port 80).
* **Backend**: Node.js Express REST API (Port 3001).
* **Container Registry**: Azure Container Registry (ACR).
* **Orchestration**: Azure Kubernetes Service (AKS).
* **Ingress**: Nginx Ingress Controller (Path-based routing).
* **Security**: Cert-manager with Let's Encrypt (Automated HTTPS).
* **Domain**: `quannv.id.vn`.

---

## 🚀 Step-by-Step Implementation Guide

### Phase 1: Containerization & ACR (Task 1)
Packaging applications into Docker images and hosting them on Azure.

**1. Create Docker Images**
* **Backend**: Optimized Node.js environment.
* **Frontend**: Multi-stage build (Build React -> Serve with Nginx).

**2. Provision Azure Container Registry (ACR)**
```bash
# Login to Azure
az login

# Create Resource Group
az group create --name mindx-intern-rg-01 --location eastasia

# Create Registry
az acr create --resource-group mindx-intern-rg-01 --name blogapp --sku Basic

# Authenticate Docker with ACR
az acr login --name blogapp

# Build & Tag Backend
docker build -t blogapp.azurecr.io/blog-backend:latest ./backend
docker push blogapp.azurecr.io/blog-backend:latest

# Build & Tag Frontend
docker build -t blogapp.azurecr.io/blog-frontend:latest ./blog-frontend
docker push blogapp.azurecr.io/blog-frontend:latest

Phase 2: Kubernetes Infrastructure
Deploying the cluster and managing traffic routing.

1. Create AKS Cluster
# Create Cluster and link to ACR
az aks create --resource-group mindx-intern-rg-01 --name my-aks-cluster --node-count 1 --attach-acr quannvregistry

# Connect kubectl to the cluster
az aks get-credentials --resource-group mindx-intern-rg-01 --name my-aks-cluster

