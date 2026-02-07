# Blog Application - Full Stack Deployment on Azure Kubernetes Service

**Project Overview:** A full-stack blog application with React frontend and Node.js backend, deployed on Azure Kubernetes Service (AKS) with OpenID Connect authentication, HTTPS/SSL, monitoring, and analytics.

**Live Application:** https://quannv.id.vn

---

## Documentation Structure

This project is divided into two weeks:

### 📘 [Week 1: Deployment on Azure Kubernetes Service](WEEK1.md)
- Phase 1: Containerization & Azure Container Registry
- Phase 2: Azure Kubernetes Service Setup
- Phase 3: Backend API Deployment
- Phase 4: Frontend Application Deployment
- Phase 5: Ingress Configuration
- Phase 6: OpenID Connect Authentication
- Phase 7: HTTPS & SSL Certificates

### 📗 [Week 2: Monitoring & Analytics](WEEK2.md)
- Phase 8: Monitoring & Analytics
  - Azure Application Insights Setup
  - Google Analytics 4 Integration
  - Accessing Metrics
  - Azure Alerts Configuration
  - Testing and Verification

---

## Quick Start
1. **Week 1**: Follow [WEEK1.md](WEEK1.md) to deploy the application to AKS
2. **Week 2**: Follow [WEEK2.md](WEEK2.md) to set up Production and Product Metrics

---

## Project Overview

### Tech Stack

**Frontend:**
- React 18.x, Lucide React, CSS

**Backend:**
- Node.js 18.x, Express 4.x, CORS, node-fetch

**Infrastructure:**
- Azure Kubernetes Service (AKS)
- Azure Container Registry (ACR)
- NGINX Ingress Controller
- Cert-Manager & Let's Encrypt

**Authentication:**
- OpenID Connect with MindX Identity Server

**Monitoring:**
- Azure Application Insights
- Google Analytics 4

**DevOps:**
- Docker, kubectl, Azure CLI

---

## Features

✅ Containerized microservices architecture  
✅ Kubernetes orchestration on Azure AKS  
✅ HTTPS/SSL with automatic certificate renewal  
✅ OpenID Connect authentication  
✅ Production monitoring with Azure Application Insights  
✅ Product analytics with Google Analytics 4  
✅ Automated alerts and error tracking  

---

## Getting Started

Follow the week-by-week guides:

1. **[Week 1](WEEK1.md)**: Deploy the application infrastructure
2. **[Week 2](WEEK2.md)**: Add monitoring and analytics

---

## Project Structure

```
blogapp/
├── backend/                 # Node.js Express API
├── blog-frontend/          # React frontend application
├── k8s/                    # Kubernetes manifests
├── docker-compose.yml      # Local development
├── WEEK1.md               # Week 1 documentation
└── WEEK2.md               # Week 2 documentation
```

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


