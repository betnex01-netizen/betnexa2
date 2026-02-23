# Add environment variables to Vercel backend project
$vars = @{
    "SUPABASE_URL" = "https://eaqogmybihiqzivuwyav.supabase.co"
    "SUPABASE_SERVICE_KEY" = "sb_secret_JnzsAy2ljyd__NdzokUXhA_2k7loTgg"
    "SUPABASE_ANON_KEY" = "sb_publishable_Lc8dQIzND4_qyIbN2EuQrQ_0Ma0OINQ"
    "PAYHERO_API_KEY" = "6CUxNcfi9jRpr4eWicAn"
    "PAYHERO_API_SECRET" = "j6zP2XpAlXn9UhtHOj9PbYQVAdlQnkeyrEWuFOAH"
    "PAYHERO_ACCOUNT_ID" = "3398"
    "NODE_ENV" = "production"
}

Write-Host "Adding environment variables to Vercel backend project..." -ForegroundColor Cyan

foreach ($key in $vars.Keys) {
    $value = $vars[$key]
    Write-Host "Adding $key..." -ForegroundColor Yellow
    
    # Use Vercel API to set environment variable
    Write-Host $key | npx vercel env add --force
    Write-Host $value
    
    Start-Sleep -Milliseconds 500
}

Write-Host "All environment variables added successfully!" -ForegroundColor Green
