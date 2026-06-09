# Checklist Deploy Đồ Án Tốt Nghiệp

## Thứ tự thực hiện

### Bước 1: Chuẩn bị GitHub
- [ ] Có GitHub repo (public hoặc private đều được)
- [ ] Chạy `scripts/push-to-github.bat` để push code
- [ ] Kiểm tra GitHub repo có các file: `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml`

### Bước 2: Database - Aiven MySQL (làm TRƯỚC backend)
- [ ] Đăng ký https://aiven.io (dùng GitHub login)
- [ ] Tạo MySQL Free service, region Singapore
- [ ] Copy: Host, Port, Password từ "Connection" tab → Java
- [ ] Chỉnh `scripts/migrate-to-cloud.bat` với thông tin Aiven
- [ ] Chạy script migrate để import DatabaseDATN.sql lên cloud
- [ ] Kiểm tra dữ liệu trên Aiven console

### Bước 3: Redis - Upstash (làm TRƯỚC backend)
- [ ] Đăng ký https://upstash.com (dùng GitHub login)
- [ ] Tạo Redis database, region Singapore
- [ ] Copy: Endpoint (host), Password

### Bước 4: Backend - Render
- [ ] Đăng ký https://render.com (dùng GitHub login)
- [ ] New → Web Service → Connect GitHub repo
- [ ] Root Directory: `backend`, Runtime: Docker, Plan: Free
- [ ] Thêm tất cả env vars từ `scripts/render-env-vars.txt`
- [ ] Click Deploy, chờ 5-10 phút
- [ ] Test: https://YOUR-BACKEND.onrender.com/actuator/health
- [ ] Note URL backend: https://_____________________.onrender.com

### Bước 5: Frontend - Vercel
- [ ] Đăng ký https://vercel.com (dùng GitHub login)
- [ ] Add New Project → Import GitHub repo
- [ ] Root Directory: `frontend`
- [ ] Thêm env vars:
  - NEXT_PUBLIC_URL = https://[URL từ bước 4]
  - NEXT_PUBLIC_GOOGLE_CLIENT_ID = [Google Client ID]
  - GROQ_API_KEY = [Groq API Key]
- [ ] Deploy, chờ 2-3 phút
- [ ] Note URL frontend: https://_____________________.vercel.app

### Bước 6: Cập nhật CORS (QUAN TRỌNG)
- [ ] Vào Render → backend service → Environment
- [ ] Sửa CORS_ALLOWED_ORIGINS = https://[URL Vercel từ bước 5]
- [ ] Save → backend sẽ auto redeploy
- [ ] Chờ deploy xong

### Bước 7: Cập nhật Google OAuth (nếu dùng Google Login)
- [ ] Vào https://console.cloud.google.com
- [ ] APIs & Services → Credentials → OAuth 2.0 Client IDs
- [ ] Thêm vào "Authorized JavaScript origins": https://[URL Vercel]
- [ ] Thêm vào "Authorized redirect URIs": https://[URL Vercel]/api/auth/callback

### Bước 8: Chống Sleep Render (khuyến nghị)
- [ ] Đăng ký https://uptimerobot.com
- [ ] Add Monitor → HTTP(s)
- [ ] URL: https://[backend].onrender.com/actuator/health
- [ ] Interval: 14 minutes

### Bước 9: Kiểm tra hoạt động
- [ ] Truy cập https://[frontend].vercel.app
- [ ] Đăng ký tài khoản mới
- [ ] Đăng nhập
- [ ] Xem sản phẩm
- [ ] Thêm vào giỏ hàng
- [ ] Test tính năng AI chat (nếu có)

## URL sau khi deploy

| Service | URL |
|---------|-----|
| Frontend | https://datn-frontend.vercel.app |
| Backend API | https://datn-backend.onrender.com |
| Backend Health | https://datn-backend.onrender.com/actuator/health |
| Database | Aiven Cloud (không có public URL) |
| Redis | Upstash (không có public URL) |

## Lưu ý quan trọng

- **Render free tier**: Sleep sau 15 phút idle, cold start 30-60 giây
- **Aiven free**: 5GB storage, không expire
- **Upstash free**: 10,000 requests/day, đủ cho demo
- **Vercel free**: Unlimited deployments, 100GB bandwidth/tháng
- **Tổng chi phí**: 0 đồng
