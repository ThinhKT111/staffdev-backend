# Script dọn dẹp file không cần thiết cho môi trường production
Write-Host "Bắt đầu dọn dẹp các file không cần thiết..." -ForegroundColor Green

# 1. Loại bỏ thư mục test và các file test
Write-Host "Đang xóa thư mục test và các file test..." -ForegroundColor Yellow
Remove-Item -Path "test" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "test-api.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "test-db.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "test-es-index.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "test-redis-cache.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "test-redis-wsl.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "test-sequences.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "test-results-final.txt" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "test-results-updated.txt" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "test-results.txt" -Force -ErrorAction SilentlyContinue

# 2. Loại bỏ các file cấu hình và hướng dẫn phát triển
Write-Host "Đang xóa các file cấu hình và hướng dẫn phát triển..." -ForegroundColor Yellow
Remove-Item -Path ".prettierrc" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "eslint.config.mjs" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "FRONTEND_INTEGRATION.md" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "PROJECT_STRUCTURE_AND_ROADMAP.md" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "README-ENHANCED.md" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "README-ISSUES.md" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "ROOT_JS_FILES.md" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "STAFFDEV_BACKEND_OVERVIEW.txt" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "TECHNOLOGIES_OVERVIEW.md" -Force -ErrorAction SilentlyContinue

# 3. Loại bỏ các script và công cụ phát triển
Write-Host "Đang xóa các script và công cụ phát triển..." -ForegroundColor Yellow
Remove-Item -Path "elasticsearch-config.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "elasticsearch-test.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "fix-redis-wsl.sh" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "fix-sequences.sql" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "redis-check.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "redis-config.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "setup-env.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "setup-redis-wsl.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "stack-status.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "update-redis-config.js" -Force -ErrorAction SilentlyContinue

# 4. Loại bỏ file không cần thiết khác (đã loại bỏ Git-related files)
Write-Host "Đang xóa các file không cần thiết khác (giữ lại Git)..." -ForegroundColor Yellow
Remove-Item -Path "env-fix.txt" -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".env.example" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "tsconfig.build.json" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "tsconfig.json" -Force -ErrorAction SilentlyContinue

# 5. Sao lưu các file SQL cần thiết
Write-Host "Đang sao lưu các file SQL cần thiết..." -ForegroundColor Yellow
Copy-Item -Path "create_database.sql" -Destination "temp_create_database.sql" -Force
Copy-Item -Path "input_data.sql" -Destination "temp_input_data.sql" -Force

Write-Host "Lưu ý: Bạn cần phải chạy 'npm install --production' sau khi dọn dẹp để cài đặt chỉ các dependencies cần thiết." -ForegroundColor Cyan
Write-Host "Dọn dẹp hoàn tất!" -ForegroundColor Green
Write-Host 
Write-Host "Hướng dẫn triển khai:" -ForegroundColor Green
Write-Host "1. Tạo file .env trên máy chủ với các cài đặt chính xác" -ForegroundColor Cyan
Write-Host "2. Chạy 'npm install --production' để cài đặt các dependencies cần thiết" -ForegroundColor Cyan
Write-Host "3. Chạy 'node dist/src/main' để khởi động máy chủ" -ForegroundColor Cyan
Write-Host "4. Sử dụng create_database.sql và input_data.sql để thiết lập cơ sở dữ liệu" -ForegroundColor Cyan 