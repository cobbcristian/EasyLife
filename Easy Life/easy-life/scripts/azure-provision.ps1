# Provision Easy Life on Azure: RG + App Service + PostgreSQL Flexible Server.
# Prerequisites: Azure CLI logged in (`az login`).
# Usage (from easy-life/):
#   powershell -ExecutionPolicy Bypass -File scripts/azure-provision.ps1

$ErrorActionPreference = "Stop"

$RG = "easy-life-rg"
$LOCATION = "westus2"
$PLAN = "easy-life-plan"
$APP = "easy-life-app"
$DB = "easy-life-db"
$DB_ADMIN = "easylifeadmin"
$DB_NAME = "easylife"

function Invoke-Az {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$AzArgs)
  & az @AzArgs | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Azure CLI failed: az $($AzArgs -join ' ') (exit $LASTEXITCODE)"
  }
}

# Generate secrets if not provided
if (-not $env:AZURE_PG_PASSWORD) {
  $bytes = New-Object byte[] 24
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $env:AZURE_PG_PASSWORD = ([Convert]::ToBase64String($bytes) -replace "[+/=]", "A") + "a1!"
  Write-Host "Generated AZURE_PG_PASSWORD (save this): $($env:AZURE_PG_PASSWORD)"
}
if (-not $env:AUTH_SECRET) {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $env:AUTH_SECRET = [Convert]::ToBase64String($bytes)
  Write-Host "Generated AUTH_SECRET"
}

Write-Host "==> Resource group $RG ($LOCATION)"
Invoke-Az group create --name $RG --location $LOCATION

Write-Host "==> App Service plan $PLAN (Linux B1)"
Invoke-Az appservice plan create `
  --name $PLAN `
  --resource-group $RG `
  --is-linux `
  --location $LOCATION `
  --sku B1

Write-Host "==> Web App $APP (Node 20)"
Invoke-Az webapp create `
  --name $APP `
  --resource-group $RG `
  --plan $PLAN `
  --runtime "NODE:22-lts"

Write-Host "==> PostgreSQL Flexible Server $DB (this takes several minutes)"
Invoke-Az postgres flexible-server create `
  --resource-group $RG `
  --name $DB `
  --location $LOCATION `
  --admin-user $DB_ADMIN `
  --admin-password $env:AZURE_PG_PASSWORD `
  --sku-name Standard_B1ms `
  --tier Burstable `
  --storage-size 32 `
  --version 15 `
  --public-access 0.0.0.0 `
  --yes

Write-Host "==> Database $DB_NAME"
Invoke-Az postgres flexible-server db create `
  --resource-group $RG `
  --server-name $DB `
  --name $DB_NAME

$PgHost = "$DB.postgres.database.azure.com"
# URL-encode password for connection string (basic)
$encPass = [uri]::EscapeDataString($env:AZURE_PG_PASSWORD)
$DATABASE_URL = "postgresql://${DB_ADMIN}:${encPass}@${PgHost}:5432/${DB_NAME}?sslmode=require"
$APP_URL = "https://${APP}.azurewebsites.net"

Write-Host "==> App settings"
Invoke-Az webapp config appsettings set `
  --name $APP `
  --resource-group $RG `
  --settings `
    DATABASE_URL="$DATABASE_URL" `
    POSTGRES_PRISMA_URL="$DATABASE_URL" `
    AUTH_SECRET="$($env:AUTH_SECRET)" `
    NEXT_PUBLIC_APP_URL="$APP_URL" `
    NODE_ENV="production" `
    SCM_DO_BUILD_DURING_DEPLOYMENT="true" `
    ALLOW_DEMO_SEED="0"

Invoke-Az webapp config set `
  --name $APP `
  --resource-group $RG `
  --startup-file "npm run start"

Write-Host ""
Write-Host "Done."
Write-Host "  App URL:      $APP_URL"
Write-Host "  Postgres:     $PgHost"
Write-Host "  DATABASE_URL: (set on App Service)"
Write-Host ""
Write-Host "Next:"
Write-Host "  1. Copy Azure Blob / Twilio / OpenAI / CRON_SECRET from Vercel into App Service settings"
Write-Host "  2. Deploy:  cd easy-life; npx vercel unlink;  OR use GitHub Actions / az webapp up"
Write-Host "  3. Seed Oceanside: set DATABASE_URL locally then npm run seed:oceanside"
Write-Host "  4. Save AZURE_PG_PASSWORD somewhere safe - it is not shown again if you lose this terminal"
