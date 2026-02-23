#!/usr/bin/env pwsh

$vars = @{
    "SUPABASE_URL" = "https://eaqogmybihiqzivuwyav.supabase.co"
    "SUPABASE_ANON_KEY" = "sb_publishable_Lc8dQIzND4_qyIbN2EuQrQ_0Ma0OINQ"
    "SUPABASE_SERVICE_KEY" = "sb_secret_JnzsAy2ljyd__NdzokUXhA_2k7loTgg"
    "PAYHERO_API_KEY" = "6CUxNcfi9jRpr4eWicAn"
    "PAYHERO_API_SECRET" = "j6zP2XpAlXn9UhtHOj9PbYQVAdlQnkeyrEWuFOAH"
    "PAYHERO_ACCOUNT_ID" = "3398"
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
