# Easy Life Deployment Guide

This guide covers deploying Easy Life to Azure App Service with Azure Database for PostgreSQL.

## Prerequisites

- Azure account with active subscription
- Azure CLI installed (`az` command)
- GitHub repository access
- Custom domain (optional): oceansideresidents.com

## Azure Resources Needed

1. **Resource Group**: `easy-life-rg`
2. **Azure App Service Plan**: `easy-life-plan` (Linux, B1 or higher)
3. **Azure Web App**: `easy-life-app`
4. **Azure Database for PostgreSQL**: `easy-life-db`

---

## Step 1: Create Azure Resources

### Login to Azure
```bash
az login
```

### Create Resource Group
```bash
az group create --name easy-life-rg --location eastus
```

### Create PostgreSQL Database
```bash
az postgres flexible-server create \
  --resource-group easy-life-rg \
  --name easy-life-db \
  --location eastus \
  --admin-user easylifeadmin \
  --admin-password <YOUR_SECURE_PASSWORD> \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 15
```

### Allow Azure Services to Connect
```bash
az postgres flexible-server firewall-rule create \
  --resource-group easy-life-rg \
  --name easy-life-db \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### Create App Service Plan
```bash
az appservice plan create \
  --name easy-life-plan \
  --resource-group easy-life-rg \
  --sku B1 \
  --is-linux
```

### Create Web App
```bash
az webapp create \
  --resource-group easy-life-rg \
  --plan easy-life-plan \
  --name easy-life-app \
  --runtime "NODE:20-lts"
```

---

## Step 2: Configure Environment Variables

### Set Database Connection String
```bash
az webapp config appsettings set \
  --resource-group easy-life-rg \
  --name easy-life-app \
  --settings \
    DATABASE_URL="postgresql://easylifeadmin:<PASSWORD>@easy-life-db.postgres.database.azure.com:5432/easylife?sslmode=require" \
    NODE_ENV="production" \
    NEXTAUTH_SECRET="<GENERATE_A_SECRET>" \
    NEXTAUTH_URL="https://easy-life-app.azurewebsites.net"
```

Generate a secure secret:
```bash
openssl rand -base64 32
```

---

## Step 3: Run Database Migrations

### Option A: From Local Machine
```bash
# Set your production DATABASE_URL
export DATABASE_URL="postgresql://easylifeadmin:<PASSWORD>@easy-life-db.postgres.database.azure.com:5432/easylife?sslmode=require"

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed the database (optional - creates Oceanside Residents community)
npx ts-node scripts/seed-oceanside-residents.ts
```

### Option B: Via GitHub Actions
The CI/CD workflow automatically runs migrations on deploy.

---

## Step 4: Deploy the Application

### Option A: GitHub Actions (Recommended)

1. Create Azure Service Principal:
```bash
az ad sp create-for-rbac \
  --name "easy-life-deploy" \
  --role contributor \
  --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/easy-life-rg \
  --json-auth
```

2. Add GitHub Secrets:
   - `AZURE_CREDENTIALS`: The JSON output from above
   - `DATABASE_URL`: Your PostgreSQL connection string

3. Push to `main` branch to trigger deployment.

### Option B: Direct Deployment via Azure CLI
```bash
# Build the app
npm run build

# Create deployment package
zip -r deploy.zip . -x "node_modules/*" ".git/*"

# Deploy
az webapp deployment source config-zip \
  --resource-group easy-life-rg \
  --name easy-life-app \
  --src deploy.zip
```

### Option C: Docker Deployment
```bash
# Build Docker image
docker build -t easy-life-app .

# Tag for Azure Container Registry
docker tag easy-life-app <your-acr>.azurecr.io/easy-life-app:latest

# Push to ACR
docker push <your-acr>.azurecr.io/easy-life-app:latest

# Configure Web App to use container
az webapp config container set \
  --name easy-life-app \
  --resource-group easy-life-rg \
  --container-image-name <your-acr>.azurecr.io/easy-life-app:latest
```

---

## Step 5: Configure Custom Domain

### Add Custom Domain
```bash
az webapp config hostname add \
  --webapp-name easy-life-app \
  --resource-group easy-life-rg \
  --hostname oceansideresidents.com
```

### DNS Configuration
Add these records to your domain:
- **A Record**: Point to your App Service IP
- **TXT Record**: `asuid.oceansideresidents.com` → Your verification ID

### Enable HTTPS
```bash
az webapp config ssl bind \
  --name easy-life-app \
  --resource-group easy-life-rg \
  --certificate-thumbprint <CERT_THUMBPRINT> \
  --ssl-type SNI
```

Or use managed certificate (free):
```bash
az webapp config ssl create \
  --name easy-life-app \
  --resource-group easy-life-rg \
  --hostname oceansideresidents.com
```

---

## Step 6: Verify Deployment

1. Visit: `https://easy-life-app.azurewebsites.net`
2. Check logs: `az webapp log tail --name easy-life-app --resource-group easy-life-rg`
3. Test login with seeded credentials

---

## Mobile App Deployment (iOS & Android)

Easy Life is a **Progressive Web App (PWA)**, which means:

### iOS (Safari)
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. The app appears as a native app icon

### Android (Chrome)
1. Open the app in Chrome
2. Chrome shows "Add to Home Screen" prompt
3. Or tap menu → "Install app"
4. The app appears in the app drawer

### Benefits of PWA
- ✅ No App Store approval needed
- ✅ Instant updates (no app store review)
- ✅ Works offline
- ✅ Push notifications
- ✅ Native app experience
- ✅ Single codebase for web + mobile

### Native App Alternative
If you need a native App Store presence:
1. **Capacitor**: Wrap the PWA in a native shell
2. **React Native**: Rebuild with React Native (separate codebase)

---

## Troubleshooting

### Database Connection Issues
```bash
# Check if database is accessible
az postgres flexible-server show \
  --name easy-life-db \
  --resource-group easy-life-rg
```

### View Application Logs
```bash
az webapp log tail \
  --name easy-life-app \
  --resource-group easy-life-rg
```

### Restart App
```bash
az webapp restart \
  --name easy-life-app \
  --resource-group easy-life-rg
```

---

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NODE_ENV` | Environment (production) | Yes |
| `NEXTAUTH_SECRET` | NextAuth.js secret key | Yes |
| `NEXTAUTH_URL` | Full URL of the app | Yes |
| `VAPID_PUBLIC_KEY` | Push notification public key | Optional |
| `VAPID_PRIVATE_KEY` | Push notification private key | Optional |

---

## Cost Estimate (Monthly)

| Resource | SKU | Est. Cost |
|----------|-----|-----------|
| App Service Plan | B1 | ~$13 |
| PostgreSQL | B1ms | ~$15 |
| Custom Domain SSL | Managed | Free |
| **Total** | | ~$28/month |

For production, consider upgrading to:
- App Service: P1V2 ($73/mo) for better performance
- PostgreSQL: GP_Gen5_2 ($100/mo) for more connections
