#!/bin/bash

# ============================================================================
# Easy Life - Azure Deployment Script
# Run this script once to deploy everything to Azure
# ============================================================================

set -e  # Exit on any error

echo "🚀 Easy Life Azure Deployment"
echo "=============================="
echo ""

# Configuration
RESOURCE_GROUP="easy-life-rg"
LOCATION="eastus"
DB_NAME="oceanside-db-$(date +%s)"  # Unique name
APP_NAME="oceanside-app-$(date +%s)"  # Unique name
DB_USER="easylifeadmin"
DB_PASSWORD="Oceanside$(openssl rand -hex 8)!"

echo "📋 Configuration:"
echo "   Resource Group: $RESOURCE_GROUP"
echo "   Location: $LOCATION"
echo "   Database: $DB_NAME"
echo "   Web App: $APP_NAME"
echo ""

# Check if logged in
echo "🔐 Checking Azure login..."
if ! az account show > /dev/null 2>&1; then
    echo "Please login to Azure..."
    az login
fi

SUBSCRIPTION=$(az account show --query name -o tsv)
echo "✅ Logged in to: $SUBSCRIPTION"
echo ""

# Create Resource Group
echo "📦 Creating Resource Group..."
az group create --name $RESOURCE_GROUP --location $LOCATION --output none
echo "✅ Resource Group created"

# Create PostgreSQL
echo "🗄️  Creating PostgreSQL Database (this takes 3-5 minutes)..."
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_NAME \
  --location $LOCATION \
  --admin-user $DB_USER \
  --admin-password "$DB_PASSWORD" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 15 \
  --yes \
  --output none
echo "✅ PostgreSQL created"

# Allow Azure services
echo "🔓 Configuring firewall..."
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_NAME \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0 \
  --output none

# Allow current IP for migrations
MY_IP=$(curl -s ifconfig.me)
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_NAME \
  --rule-name AllowMyIP \
  --start-ip-address $MY_IP \
  --end-ip-address $MY_IP \
  --output none
echo "✅ Firewall configured"

# Create App Service Plan
echo "📱 Creating App Service Plan..."
az appservice plan create \
  --name "${APP_NAME}-plan" \
  --resource-group $RESOURCE_GROUP \
  --sku B1 \
  --is-linux \
  --output none
echo "✅ App Service Plan created"

# Create Web App
echo "🌐 Creating Web App..."
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan "${APP_NAME}-plan" \
  --name $APP_NAME \
  --runtime "NODE:20-lts" \
  --output none
echo "✅ Web App created"

# Build connection string
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_NAME}.postgres.database.azure.com:5432/postgres?sslmode=require"
NEXTAUTH_SECRET=$(openssl rand -base64 32)
APP_URL="https://${APP_NAME}.azurewebsites.net"

# Configure environment variables
echo "⚙️  Configuring environment variables..."
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --settings \
    DATABASE_URL="$DATABASE_URL" \
    NODE_ENV="production" \
    NEXTAUTH_SECRET="$NEXTAUTH_SECRET" \
    NEXTAUTH_URL="$APP_URL" \
  --output none
echo "✅ Environment variables set"

# Run database migrations
echo "🗃️  Running database migrations..."
export DATABASE_URL="$DATABASE_URL"
npx prisma generate
npx prisma migrate deploy
echo "✅ Migrations complete"

# Seed the database
echo "🌱 Seeding Oceanside Residents community..."
npx ts-node scripts/seed-oceanside-residents.ts
echo "✅ Database seeded"

# Build the app
echo "🔨 Building the application..."
npm run build
echo "✅ Build complete"

# Create deployment package
echo "📦 Creating deployment package..."
zip -r deploy.zip .next package.json package-lock.json public prisma next.config.ts -x "*.git*"
echo "✅ Package created"

# Deploy
echo "🚀 Deploying to Azure (this takes 2-3 minutes)..."
az webapp deployment source config-zip \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --src deploy.zip \
  --output none
echo "✅ Deployed!"

# Clean up
rm deploy.zip

# Print summary
echo ""
echo "=============================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "=============================================="
echo ""
echo "🌐 Your app is live at:"
echo "   $APP_URL"
echo ""
echo "🔐 Login credentials:"
echo "   Email: Dlms6768@gmail.com"
echo "   Password: Slater96!"
echo ""
echo "📱 To install as mobile app:"
echo "   iOS: Open in Safari → Share → Add to Home Screen"
echo "   Android: Open in Chrome → Menu → Install app"
echo ""
echo "💾 Database credentials (save these!):"
echo "   Host: ${DB_NAME}.postgres.database.azure.com"
echo "   User: $DB_USER"
echo "   Password: $DB_PASSWORD"
echo ""
echo "💰 Estimated cost: ~\$28/month"
echo ""
echo "=============================================="
