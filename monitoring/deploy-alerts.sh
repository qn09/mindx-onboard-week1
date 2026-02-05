#!/bin/bash

# Deploy Azure Monitor Alert Rules for Blog Application
# Usage: ./deploy-alerts.sh

set -e

# Configuration
RESOURCE_GROUP="mindx-intern-01-rg"
APP_INSIGHTS_NAME="blogapp-insights"
ACTION_GROUP_NAME="blogapp-alerts-action-group"
LOCATION="eastasia"
EMAIL="quannv@example.com"

echo "======================================"
echo "Deploying Azure Monitor Alert Rules"
echo "======================================"
echo ""

# Get subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo "Subscription ID: $SUBSCRIPTION_ID"

# Get Application Insights resource ID
APP_INSIGHTS_ID=$(az monitor app-insights component show \
  --app $APP_INSIGHTS_NAME \
  --resource-group $RESOURCE_GROUP \
  --query id -o tsv)

echo "Application Insights ID: $APP_INSIGHTS_ID"
echo ""

# Create Action Group for notifications
echo "Creating Action Group: $ACTION_GROUP_NAME..."
az monitor action-group create \
  --name $ACTION_GROUP_NAME \
  --resource-group $RESOURCE_GROUP \
  --short-name "BlogAlert" \
  --email-receiver admin $EMAIL \
  --output table

ACTION_GROUP_ID=$(az monitor action-group show \
  --name $ACTION_GROUP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query id -o tsv)

echo "Action Group ID: $ACTION_GROUP_ID"
echo ""

# Alert 1: High Error Rate
echo "Creating alert: High Error Rate..."
az monitor scheduled-query create \
  --name "High-Error-Rate" \
  --resource-group $RESOURCE_GROUP \
  --scopes $APP_INSIGHTS_ID \
  --condition "count 'Placeholder' > 0" \
  --condition-query "requests | where timestamp > ago(5m) | summarize total = count(), errors = countif(success == false) | extend errorRate = (errors * 100.0) / total | where errorRate > 5" \
  --description "Alert when error rate exceeds 5%" \
  --evaluation-frequency 5m \
  --window-size 5m \
  --severity 2 \
  --action-groups $ACTION_GROUP_ID \
  --output table

# Alert 2: Slow Response Time
echo "Creating alert: Slow Response Time..."
az monitor scheduled-query create \
  --name "Slow-Response-Time" \
  --resource-group $RESOURCE_GROUP \
  --scopes $APP_INSIGHTS_ID \
  --condition "count 'Placeholder' > 0" \
  --condition-query "requests | where timestamp > ago(5m) | summarize p95 = percentile(duration, 95) | where p95 > 2000" \
  --description "Alert when P95 response time exceeds 2 seconds" \
  --evaluation-frequency 5m \
  --window-size 5m \
  --severity 3 \
  --action-groups $ACTION_GROUP_ID \
  --output table

# Alert 3: High Exception Rate
echo "Creating alert: High Exception Rate..."
az monitor scheduled-query create \
  --name "High-Exception-Rate" \
  --resource-group $RESOURCE_GROUP \
  --scopes $APP_INSIGHTS_ID \
  --condition "count 'Placeholder' > 0" \
  --condition-query "exceptions | where timestamp > ago(5m) | summarize count() | where count_ > 10" \
  --description "Alert when exception count exceeds 10 in 5 minutes" \
  --evaluation-frequency 5m \
  --window-size 5m \
  --severity 1 \
  --action-groups $ACTION_GROUP_ID \
  --output table

# Alert 4: Dependency Failures
echo "Creating alert: Dependency Failures..."
az monitor scheduled-query create \
  --name "Dependency-Failures" \
  --resource-group $RESOURCE_GROUP \
  --scopes $APP_INSIGHTS_ID \
  --condition "count 'Placeholder' > 0" \
  --condition-query "dependencies | where timestamp > ago(5m) | where success == false | summarize count() by target | where count_ > 3" \
  --description "Alert when dependencies fail more than 3 times" \
  --evaluation-frequency 5m \
  --window-size 5m \
  --severity 2 \
  --action-groups $ACTION_GROUP_ID \
  --output table

echo ""
echo "======================================"
echo "Alert Rules Deployed Successfully!"
echo "======================================"
echo ""
echo "Verify alerts in Azure Portal:"
echo "1. Go to Application Insights > $APP_INSIGHTS_NAME"
echo "2. Navigate to Alerts"
echo "3. Check Alert Rules"
echo ""
echo "Action Group: $ACTION_GROUP_NAME"
echo "Email notifications will be sent to: $EMAIL"
