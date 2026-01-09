# refactor-brand.ps1

# Cấu hình đường dẫn thư mục cần quét (mặc định là thư mục hiện tại)
$TargetFolder = Get-Location

# Các đuôi file cần xử lý
$IncludeExtensions = @("*.tsx", "*.ts", "*.jsx", "*.js")

# Danh sách các cặp thay thế (Old -> New)
# Lưu ý: Thứ tự quan trọng. Xử lý các chuỗi dài/cụ thể trước.
$Replacements = @{
    # Backgrounds
    "bg-blue-600"       = "bg-brand-primary";
    "bg-blue-500"       = "bg-brand-primary"; # Cẩn thận: Có thể ảnh hưởng nút Info
    "hover:bg-blue-500" = "hover:bg-brand-primary/90"; # Tạo hiệu ứng hover nhẹ
    "hover:bg-blue-600" = "hover:bg-brand-primary";
    
    # Texts
    "text-blue-600"     = "text-brand-primary";
    "text-blue-500"     = "text-brand-primary";
    "text-blue-400"     = "text-brand-primary"; # Thường dùng trên nền tối
    
    # Borders
    "border-blue-600"   = "border-brand-primary";
    "border-blue-500"   = "border-brand-primary";
    "focus:border-blue-500" = "focus:border-brand-primary";
    
    # Gradients & Others
    "from-blue-600"     = "from-brand-primary";
    "to-blue-600"       = "to-brand-primary";
    "accent-blue-600"   = "accent-brand-primary";
    "accent-blue-500"   = "accent-brand-primary";
    "selection:bg-blue-500" = "selection:bg-brand-primary";
    
    # Background Opacity (Ví dụ: bg-blue-600/10)
    "bg-blue-600/"      = "bg-brand-primary/";
    "bg-blue-500/"      = "bg-brand-primary/";
    "border-blue-500/"  = "border-brand-primary/";
}

Write-Host "Dang khoi tao qua trinh Branding Refactor..." -ForegroundColor Cyan
Write-Host "Target: $TargetFolder" -ForegroundColor Gray

# Lấy danh sách file
$Files = Get-ChildItem -Path $TargetFolder -Include $IncludeExtensions -Recurse -File | 
         Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch ".git" }

$Count = 0

foreach ($File in $Files) {
    $Content = Get-Content -Path $File.FullName -Raw -Encoding UTF8
    $OriginalContent = $Content
    $Modified = $false

    foreach ($Key in $Replacements.Keys) {
        if ($Content -match $Key) {
            $NewValue = $Replacements[$Key]
            # Thay thế chuỗi (Case-insensitive)
            $Content = $Content -replace [Regex]::Escape($Key), $NewValue
            $Modified = $true
        }
    }

    if ($Modified) {
        Set-Content -Path $File.FullName -Value $Content -Encoding UTF8
        Write-Host "Updated: $($File.Name)" -ForegroundColor Green
        $Count++
    }
}

Write-Host "------------------------------------------------"
Write-Host "Hoan tat! Da cap nhat $Count file." -ForegroundColor Yellow
Write-Host "Vui long kiem tra lai giao dien web." -ForegroundColor Cyan