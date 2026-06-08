Write-Host "=== Hbee Digitals Subscription Diagnostic ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1] Checking API route existence..." -ForegroundColor Yellow
if (Test-Path "src\app\api\subscribe\route.ts") {
    Write-Host "✓ API route exists" -ForegroundColor Green
} else {
    Write-Host "✗ API route MISSING!" -ForegroundColor Red
}

Write-Host ""
Write-Host "[2] Checking API route content..." -ForegroundColor Yellow
$apiContent = Get-Content "src\app\api\subscribe\route.ts" -ErrorAction SilentlyContinue
if ($apiContent -match "export async function POST") {
    Write-Host "✓ API route has POST handler" -ForegroundColor Green
} else {
    Write-Host "✗ API route missing POST handler" -ForegroundColor Red
}

Write-Host ""
Write-Host "[3] Checking SubscribePopup component..." -ForegroundColor Yellow
if (Test-Path "src\components\SubscribePopup.tsx") {
    Write-Host "✓ SubscribePopup exists" -ForegroundColor Green
} else {
    Write-Host "✗ SubscribePopup MISSING" -ForegroundColor Red
}

Write-Host ""
Write-Host "[4] Checking Footer component subscribe handler..." -ForegroundColor Yellow
$footerContent = Get-Content "src\components\Footer.tsx" -ErrorAction SilentlyContinue
if ($footerContent -match "handleSubscribe") {
    Write-Host "✓ Footer has subscribe handler" -ForegroundColor Green
} else {
    Write-Host "✗ Footer missing subscribe handler" -ForegroundColor Red
}

Write-Host ""
Write-Host "[5] Checking if dev server is running..." -ForegroundColor Yellow
$portCheck = netstat -ano 2>$null | findstr :3000
if ($portCheck) {
    Write-Host "✓ Dev server appears to be running on port 3000" -ForegroundColor Green
} else {
    Write-Host "⚠ Dev server NOT running. Run: npm run dev" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[6] Checking environment variables..." -ForegroundColor Yellow
if (Test-Path ".env.local") {
    $envContent = Get-Content ".env.local"
    if ($envContent -match "NEXT_PUBLIC_SUPABASE_URL") {
        Write-Host "✓ NEXT_PUBLIC_SUPABASE_URL found" -ForegroundColor Green
    } else {
        Write-Host "✗ NEXT_PUBLIC_SUPABASE_URL MISSING" -ForegroundColor Red
    }
    if ($envContent -match "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
        Write-Host "✓ NEXT_PUBLIC_SUPABASE_ANON_KEY found" -ForegroundColor Green
    } else {
        Write-Host "✗ NEXT_PUBLIC_SUPABASE_ANON_KEY MISSING" -ForegroundColor Red
    }
} else {
    Write-Host "✗ .env.local file not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Make sure dev server is running: npm run dev"
Write-Host "2. Open browser at http://localhost:3000"
Write-Host "3. Open DevTools (F12) → Console tab"
Write-Host "4. Run this test in console:"
Write-Host "   fetch('/api/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'test@test.com'})}).then(r=>r.json()).then(console.log)"
Write-Host ""
Write-Host "5. Also check Supabase SQL Editor and run:"
Write-Host "   SELECT * FROM newsletter_subscribers;"
