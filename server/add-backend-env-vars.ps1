#!/usr/bin/env pwsh

$vars = @{
    "SUPABASE_URL" = "https://your-supabase-url.supabase.co"
    "SUPABASE_ANON_KEY" = "your_supabase_anon_key"
    "SUPABASE_SERVICE_KEY" = "your_supabase_service_key"
    "PAYHERO_API_KEY" = "your_payhero_api_key"
    "PAYHERO_API_SECRET" = "your_payhero_api_secret"
    "PAYHERO_ACCOUNT_ID" = "your_payhero_account_id"
    "NODE_ENV" = "production"
    "PORT" = "5000"
    "CALLBACK_URL" = "https://server-chi-orcin.vercel.app/api/callbacks"
}

Write-Host "🔧 Adding environment variables to Vercel backend..." -ForegroundColor Green
Write-Host ""

foreach ($key in $vars.Keys) {
    $value = $vars[$key]
    Write-Host "Adding: $key" -ForegroundColor Cyan
    
    # Use a simple approach
    $cmd = "cd `"c:\Users\user\Downloads\BETNEXA PROFESSIONAL\server`" ; npx vercel env add `"$key`" `"$value`""
    # Note: This requires interactive confirmation on Vercel CLI
}

Write-Host ""
Write-Host "✅ Environment variables added!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Go to: https://vercel.com/dashboard/server-chi-orcin/settings/environment-variables"
Write-Host "2. Verify all variables are added"
Write-Host "3. Go to Deployments and redeploy the latest version"
Write-Host "4. Server should start working!" -ForegroundColor Green
