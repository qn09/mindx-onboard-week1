# DevOps Setup Guide - Ingress Controller Installation

## **Step 1: Verify Permissions & Namespace**

```powershell
# Check if ingress-nginx namespace exists
kubectl get namespace ingress-nginx

# If not exists, create it
kubectl create namespace ingress-nginx

# Verify you have cluster admin permissions
kubectl auth can-i create namespaces --as=system:serviceaccount:default:default
```

## **Step 2: Add Helm Repository**

```powershell
# Add official nginx-ingress helm repo
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Verify repo added
helm repo list | grep ingress-nginx
```

## **Step 3: Install Nginx Ingress Controller**

### **Option A: Basic Installation**
```powershell
helm install nginx-ingress ingress-nginx/ingress-nginx `
  --namespace ingress-nginx `
  --create-namespace
```

### **Option B: Production Configuration**
```powershell
helm install nginx-ingress ingress-nginx/ingress-nginx `
  --namespace ingress-nginx `
  --create-namespace `
  --values ingress-values.yaml `
  --set controller.service.type=LoadBalancer `
  --set controller.replicaCount=2 `
  --set controller.resources.requests.memory=128Mi `
  --set controller.resources.requests.cpu=100m `
  --set controller.resources.limits.memory=512Mi `
  --set controller.resources.limits.cpu=500m
```

### **Option C: Azure Load Balancer Integration (AKS)**
```powershell
helm install nginx-ingress ingress-nginx/ingress-nginx `
  --namespace ingress-nginx `
  --create-namespace `
  --set controller.service.type=LoadBalancer `
  --set controller.service.externalTrafficPolicy=Local `
  --set controller.metrics.enabled=true `
  --set controller.podAnnotations."prometheus\.io/scrape"=true `
  --set controller.podAnnotations."prometheus\.io/port"=10254
```

## **Step 4: Verify Installation**

```powershell
# Check ingress controller pods
kubectl get pods -n ingress-nginx

# Check ingress controller service
kubectl get svc -n ingress-nginx

# Get external IP (may take few minutes on cloud)
kubectl get svc nginx-ingress-ingress-nginx-controller -n ingress-nginx

# Describe service
kubectl describe svc nginx-ingress-ingress-nginx-controller -n ingress-nginx

# Check logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx -f
```

## **Step 5: Deploy Ingress Resource**

```powershell
# Deploy API ingress
kubectl apply -f k8s/backend/ingress.yaml

# Verify ingress created
kubectl get ingress

# Get ingress details
kubectl describe ingress blog-backend-ingress
kubectl describe ingress blog-api-ingress
```

## **Step 6: Test Routing**

### **Development (Port Forward)**
```powershell
# Port forward ingress controller
kubectl port-forward -n ingress-nginx `
  svc/nginx-ingress-ingress-nginx-controller 8080:80

# From another terminal, test API
curl http://localhost:8080/api/posts
curl http://localhost:8080/api/health

# Test with Host header (if needed)
curl -H "Host: api.blog.com" http://localhost:8080/
curl -H "Host: blog.com" http://localhost:8080/api/posts
```

### **Production (External Load Balancer)**
```powershell
# Get LoadBalancer external IP
$LB_IP = kubectl get svc nginx-ingress-ingress-nginx-controller `
  -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

Write-Host "LoadBalancer IP: $LB_IP"

# Test API directly (requires DNS or hosts file setup)
curl http://$LB_IP/api/posts

# Or via domain (if DNS configured)
curl http://api.blog.com/api/posts
curl http://blog.com/api/posts
```

## **Step 7: Troubleshooting**

```powershell
# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx

# Check ingress resource status
kubectl get ingress -o wide
kubectl get ingress blog-api-ingress -o yaml

# Check endpoints
kubectl get endpoints blog-backend

# Test connectivity to service
kubectl run -it --rm debug --image=busybox --restart=Never -- `
  wget -O- http://blog-backend:3001/api/posts

# Port forward to debug service
kubectl port-forward svc/blog-backend 3001:3001 &
curl http://localhost:3001/api/posts
```

## **Step 8: Enable Metrics & Monitoring (Optional)**

```powershell
# Check metrics enabled
kubectl get svc -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx

# Port forward metrics
kubectl port-forward -n ingress-nginx `
  svc/nginx-ingress-ingress-nginx-controller 10254:10254

# Access Prometheus metrics
curl http://localhost:10254/metrics
```

## **Common Issues & Solutions**

| Issue | Solution |
|-------|----------|
| **Permission denied** | Ask DevOps for cluster admin role |
| **LoadBalancer stuck pending** | Use NodePort instead in dev environment |
| **Ingress not routing** | Check `kubectl describe ingress`, verify service endpoints |
| **503 Bad Gateway** | Pods not ready - check `kubectl get pods` |
| **CORS errors** | Enable CORS annotations in ingress (already configured) |

## **Cleanup**

```powershell
# Delete ingress
kubectl delete ingress blog-backend-ingress blog-api-ingress

# Delete ingress controller (if needed)
helm uninstall nginx-ingress -n ingress-nginx

# Delete namespace
kubectl delete namespace ingress-nginx
```
