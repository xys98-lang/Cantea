# 👨‍💻 Cantea - Hướng Dẫn Chi Tiết Cho Người Mới (Từ Zero)

**Hướng dẫn này dành cho những người không có kinh nghiệm lập trình.** 
Chúng ta sẽ làm từng bước, từng click, không bỏ sót gì.

---

## 📋 Các Công Cụ Cần Cài (Tổng Quát)

Đây là những phần mềm bạn cần cài trên máy tính:

| Công Cụ | Dùng Để Làm Gì | Tải Từ Đâu |
|---------|----------------|-----------|
| **Node.js** | Chạy backend (máy chủ) | https://nodejs.org |
| **Visual Studio Code** | Viết code | https://code.visualstudio.com |
| **MongoDB** | Lưu trữ dữ liệu | https://www.mongodb.com |
| **Git** | Quản lý code | https://git-scm.com |
| **Postman** | Test API | https://www.postman.com |
| **Android Studio** (nếu dev Android) | Chạy app Android | https://developer.android.com/studio |

---

## 🖥️ BƯỚC 1: Cài Node.js

### Node.js Là Gì?
**Node.js** là môi trường để chạy code JavaScript trên máy tính. Nó giúp chúng ta chạy backend (phần máy chủ của app).

### Cách Cài:

#### 1️⃣ Mở trình duyệt (Chrome, Safari, Firefox)

#### 2️⃣ Truy cập: https://nodejs.org

![Node.js Website](https://nodejs.org)

#### 3️⃣ Bạn sẽ thấy 2 nút download:
- **LTS** (Long Term Support) - Khuyên dùng ✅
- **Current** - Phiên bản mới nhất

**Chọn LTS** (bên trái) → Click download

#### 4️⃣ File `.pkg` (macOS) hoặc `.exe` (Windows) sẽ tải về

#### 5️⃣ Double-click file vừa tải → Làm theo hướng dẫn cài đặt
```
- Click "Next"
- Chọn "I Agree"
- Tiếp tục click "Next"
- Click "Install"
- Chờ hoàn thành
```

#### 6️⃣ Kiểm tra cài đặt thành công

**Trên Windows:**
1. Mở Command Prompt (tìm "cmd" trong Start menu)
2. Gõ: `node --version`
3. Nên thấy: `v18.x.x` hoặc cao hơn

**Trên macOS:**
1. Mở Terminal (Cmd + Space, gõ "terminal")
2. Gõ: `node --version`
3. Nên thấy: `v18.x.x` hoặc cao hơn

✅ **Node.js cài thành công!**

---

## 📝 BƯỚC 2: Cài Visual Studio Code (VS Code)

### VS Code Là Gì?
**VS Code** là chương trình để viết code. Nó như một trình soạn thảo siêu mạnh mẽ cho lập trình viên.

### Cách Cài:

#### 1️⃣ Mở trình duyệt → Truy cập: https://code.visualstudio.com

#### 2️⃣ Click nút Download xanh lớn

#### 3️⃣ Chọn phiên bản của bạn:
- **macOS** → macOS version
- **Windows** → Windows version

#### 4️⃣ Mở file tải về → Làm theo hướng dẫn

#### 5️⃣ Mở VS Code
- Trong VS Code, nhấn: `Cmd+Shift+P` (Mac) hoặc `Ctrl+Shift+P` (Windows)
- Gõ: `Extensions`
- Tìm và cài:
  - **ES7+ React/Redux/React-Native snippets**
  - **Thunder Client** (hoặc Postman)

✅ **VS Code cài thành công!**

---

## 🗄️ BƯỚC 3: Cài MongoDB

### MongoDB Là Gì?
**MongoDB** là nơi lưu trữ dữ liệu. Nó như một kho dữ liệu cho ứng dụng của bạn.

### Cách Cài - Dùng MongoDB Atlas (Dễ Hơn):

**MongoDB Atlas** là MongoDB trên cloud (internet), không cần cài trên máy tính.

#### 1️⃣ Mở trình duyệt → Truy cập: https://www.mongodb.com/cloud/atlas

#### 2️⃣ Click "Try Free"

#### 3️⃣ Tạo tài khoản:
```
- Email: your-email@gmail.com
- Password: mật khẩu mạnh
- Ngôn ngữ: English
- Click "Create an account"
```

#### 4️⃣ Verify email:
- Mở email
- Click link xác nhận từ MongoDB

#### 5️⃣ Tạo Organization:
```
- Organization Name: "Cantea"
- Click "Create Organization"
```

#### 6️⃣ Tạo Project:
```
- Project Name: "Cantea"
- Click "Create Project"
```

#### 7️⃣ Tạo Cluster (Database):
```
- Click "Create" button
- Chọn "Free Tier"
- Provider: "AWS" 
- Region: "Singapore" (gần Việt Nam)
- Click "Create Cluster"
- Chờ 5-10 phút...
```

#### 8️⃣ Tạo Database User:
```
1. Bên trái: Click "Database Access"
2. Click "Add New Database User"
3. Username: cantea_user
4. Password: Cantea@2024 (ghi nhớ)
5. Click "Add User"
```

#### 9️⃣ Thêm IP Address:
```
1. Bên trái: Click "Network Access"
2. Click "Add IP Address"
3. Chọn "Allow Access from Anywhere"
4. Click "Confirm"
```

#### 🔟 Lấy Connection String:
```
1. Bên trái: Click "Database"
2. Click "Connect" 
3. Chọn "Drivers"
4. Language: "Node.js"
5. Copy connection string
```

Sẽ thấy cái gì như vậy:
```
mongodb+srv://cantea_user:<password>@cluster0.xxxxx.mongodb.net/myFirstDatabase?retryWrites=true&w=majority
```

**Ghi nhớ cái này!** Chúng ta sẽ dùng sau.

✅ **MongoDB cài thành công!**

---

## 🔧 BƯỚC 4: Cài Git

### Git Là Gì?
**Git** là công cụ để quản lý code. Nó giúp bạn lưu trữ các phiên bản khác nhau của code.

### Cách Cài:

#### 1️⃣ Mở trình duyệt → Truy cập: https://git-scm.com

#### 2️⃣ Click "Download for [Windows/Mac]"

#### 3️⃣ Mở file tải về → Làm theo hướng dẫn cài đặt

#### 4️⃣ Kiểm tra cài thành công:

**Trên Windows:**
1. Mở Command Prompt
2. Gõ: `git --version`
3. Nên thấy: `git version 2.x.x`

**Trên macOS:**
1. Mở Terminal
2. Gõ: `git --version`
3. Nên thấy: `git version 2.x.x`

✅ **Git cài thành công!**

---

## 📮 BƯỚC 5: Cài Postman (Test API)

### Postman Là Gì?
**Postman** là công cụ để kiểm tra backend có hoạt động đúng không.

### Cách Cài:

#### 1️⃣ Mở trình duyệt → Truy cập: https://www.postman.com

#### 2️⃣ Click "Download" hoặc "Download Postman"

#### 3️⃣ Chọn phiên bản:
- **macOS**: Chọn bản cho Mac
- **Windows**: Chọn bản cho Windows

#### 4️⃣ Mở file tải về → Cài đặt

#### 5️⃣ Tạo tài khoản (hoặc bỏ qua)

#### 6️⃣ Mở Postman → Sẵn sàng test API

✅ **Postman cài thành công!**

---

## 📱 BƯỚC 6: Cài Android Studio (Nếu Muốn Test Android)

### Android Studio Là Gì?
**Android Studio** là công cụ để chạy app Android trên máy tính (qua emulator - máy ảo).

### Nếu Bạn Chỉ Muốn Test Trên Web:
**Bỏ qua bước này!** Chúng ta có thể test trên web browser.

### Nếu Muốn Test Trên Android:

#### 1️⃣ Mở trình duyệt → Truy cập: https://developer.android.com/studio

#### 2️⃣ Click "Download Android Studio"

#### 3️⃣ Chọn phiên bản (Mac/Windows)

#### 4️⃣ Mở file tải về → Làm theo hướng dẫn
```
- Click "Next"
- Chọn "Android Virtual Device"
- Click "Next"
- Chờ cài đặt...
```

#### 5️⃣ Tạo Emulator (máy ảo Android):
```
1. Mở Android Studio
2. Click "More Options" → "Virtual Device Manager"
3. Click "+ Create Device"
4. Chọn "Pixel 4"
5. Click "Next"
6. Chọn "Android 13"
7. Click "Download" (nếu cần)
8. Click "Next" → "Finish"
```

✅ **Android Studio cài thành công!**

---

## 📂 BƯỚC 7: Lấy Mã Nguồn (Source Code)

### Source Code Là Gì?
**Source Code** chính là toàn bộ code của app Cantea mà tôi đã tạo.

### Cách Lấy:

#### Cách 1: Tải ZIP (Dễ Nhất)

1. Nếu tôi cho link download:
   - Click link → Chọn "Download as ZIP"
   - Giải nén file ZIP

2. Hoặc copy từ `/home/claude/cantea-project/`

#### Cách 2: Dùng Git

**Trên Windows:**
1. Mở Command Prompt
2. Gõ: `git clone https://link-to-repo.git`

**Trên macOS:**
1. Mở Terminal
2. Gõ: `git clone https://link-to-repo.git`

✅ **Code lấy thành công!**

---

## 🚀 BƯỚC 8: Mở Project Trong VS Code

### Làm Như Thế Nào:

#### 1️⃣ Mở VS Code

#### 2️⃣ Click "File" → "Open Folder"

#### 3️⃣ Chọn folder `cantea-project`

#### 4️⃣ Chọn "Trust the authors"

#### 5️⃣ Bây giờ bạn có thể thấy cấu trúc project:
```
📁 cantea-project/
  📁 backend/          ← Backend code
  📁 mobile-app/       ← Mobile code
  📄 README.md
  📄 docker-compose.yml
  ...
```

#### 6️⃣ Mở Terminal trong VS Code:
- Nhấn: `Ctrl+\`` (hoặc Cmd+\` trên Mac)
- Hoặc: Bên trên → View → Terminal

✅ **Project mở trong VS Code!**

---

## ⚙️ BƯỚC 9: Cài Dependencies (Thư Viện)

### Dependencies Là Gì?
**Dependencies** là những thư viện, công cụ khác mà project cần dùng.

### Cài Backend Dependencies:

#### 1️⃣ Trong Terminal của VS Code, chạy:
```bash
cd backend
npm install
```

**Chờ 2-3 phút...** Sẽ tải về tất cả thư viện cần thiết.

#### 2️⃣ Kiểm tra hoàn thành:
- Terminal sẽ hiển thị: `added XXX packages in XXX seconds`
- Không có lỗi màu đỏ

### Cài Mobile Dependencies:

#### 1️⃣ Mở Terminal mới:
- Nhấn: `Ctrl+Shift+\`` (hoặc Cmd+Shift+\` trên Mac)

#### 2️⃣ Chạy:
```bash
cd ../mobile-app
npm install
```

**Chờ 3-5 phút...**

✅ **Dependencies cài xong!**

---

## 🔑 BƯỚC 10: Setup File .env (Biến Môi Trường)

### .env File Là Gì?
**.env** là file chứa thông tin quan trọng như mật khẩu, connection string, etc. 
**KHÔNG được public!**

### Cách Setup:

#### 1️⃣ Trong VS Code, mở folder `backend`

#### 2️⃣ Tìm file `.env.example`

#### 3️⃣ Right-click → "Copy"

#### 4️⃣ Right-click → "Paste" → Đổi tên thành `.env`

#### 5️⃣ Double-click file `.env` để mở

#### 6️⃣ Sửa những dòng này:

```env
NODE_ENV=development
PORT=5000

# MongoDB - Dùng cái lấy từ MongoDB Atlas
MONGODB_URI=mongodb+srv://cantea_user:Cantea@2024@cluster0.xxxxx.mongodb.net/cantea?retryWrites=true&w=majority

JWT_SECRET=your-super-secret-key-12345
```

#### 7️⃣ Lưu file: `Ctrl+S` (Windows) hoặc `Cmd+S` (Mac)

✅ **.env file setup xong!**

---

## 🏃‍♂️ BƯỚC 11: Chạy Backend (Máy Chủ)

### Backend Là Gì?
**Backend** là phần "máy chủ" của app - nó lưu trữ dữ liệu và xử lý logic.

### Cách Chạy:

#### 1️⃣ Trong VS Code Terminal, đảm bảo bạn trong folder `backend`:
```bash
cd backend
```

#### 2️⃣ Chạy backend:
```bash
npm run dev
```

#### 3️⃣ Bạn sẽ thấy:
```
✅ MongoDB connected successfully
🚀 Cantea Backend running on port 5000
📍 API URL: http://localhost:5000
```

**Giữ terminal này chạy!** Đừng tắt.

#### 4️⃣ Kiểm tra backend hoạt động:

**Cách 1: Dùng Postman**
1. Mở Postman
2. Click "+" → "New Request"
3. Phía trên, chọn "GET"
4. Paste URL: `http://localhost:5000/api/health`
5. Click "Send"
6. Nên thấy response:
```json
{
  "status": "OK",
  "timestamp": "2024-08-21T..."
}
```

**Cách 2: Dùng trình duyệt**
1. Mở Chrome/Firefox
2. Gõ URL: `http://localhost:5000/api/health`
3. Nên thấy JSON response

✅ **Backend chạy thành công!**

---

## 📱 BƯỚC 12: Chạy Mobile App

### Mobile App Là Gì?
**Mobile App** là ứng dụng điện thoại mà người dùng sẽ dùng.

### Cách Chạy:

#### 1️⃣ Mở Terminal mới trong VS Code
- Nhấn: `Ctrl+Shift+\`` (hoặc Cmd+Shift+\`)

#### 2️⃣ Đi vào folder mobile-app:
```bash
cd mobile-app
```

#### 3️⃣ Chạy Expo:
```bash
npm start
```

#### 4️⃣ Bạn sẽ thấy menu:
```
➜  Expo server started
i press 'i' to open iOS Emulator
a press 'a' to open Android Emulator
w press 'w' to open web browser
r press 'r' to reload
s press 's' to switch between dev & prod
```

#### 5️⃣ Chọn cách test:

**Cách 1: Test Trên Web Browser (Dễ Nhất)**
- Nhấn: `w`
- Trình duyệt sẽ mở app trên http://localhost:19006

**Cách 2: Test Trên iOS Simulator (macOS)**
- Nhấn: `i`
- iOS Simulator sẽ mở (chỉ dùng được trên Mac)

**Cách 3: Test Trên Android Emulator**
- Nhấn: `a`
- Android Emulator sẽ mở (cần cài Android Studio)

✅ **Mobile App chạy thành công!**

---

## 🎉 Chúc Mừng!

Bây giờ bạn đã:
- ✅ Cài tất cả công cụ cần thiết
- ✅ Setup môi trường
- ✅ Chạy Backend thành công
- ✅ Chạy Mobile App thành công

---

## 📞 Troubleshooting (Fix Lỗi)

### Lỗi: "npm: command not found"
```
❌ Node.js chưa cài hoặc chưa restart máy
✅ Cài lại Node.js → Restart máy tính
```

### Lỗi: "Cannot find module"
```
❌ Dependencies chưa cài đầy đủ
✅ Chạy: npm install
```

### Lỗi: "Port 5000 already in use"
```
❌ Có chương trình khác dùng port 5000
✅ Trên Windows: tasklist | find "node"
✅ Trên Mac: lsof -i :5000
✅ Kill process (hoặc restart máy)
```

### Lỗi: "MongoDB connection failed"
```
❌ MongoDB Atlas connection string sai
✅ Kiểm tra lại:
   - Username/password đúng?
   - IP whitelist được add?
   - Connection string format đúng?
```

### Lỗi: "Terminal không mở được"
```
❌ Terminal không kích hoạt
✅ Trên VS Code: Ctrl+`  (backtick)
✅ Hoặc: View → Terminal
```

---

## 📚 Nếu Bạn Muốn Hiểu Thêm

### Các Khái Niệm Cơ Bản:

**Backend** = Máy chủ, xử lý logic
- Lưu trữ dữ liệu
- Xử lý các yêu cầu
- Trả dữ liệu cho frontend

**Frontend/Mobile** = Giao diện người dùng
- Cái mà người dùng thấy
- Gửi yêu cầu đến backend
- Hiển thị dữ liệu

**API** = Cầu nối giữa backend và frontend
- Mobile app gọi API
- Backend xử lý và trả kết quả

**Database** = Kho lưu trữ dữ liệu
- Lưu user, grades, posts, etc.

**npm** = Package manager
- Công cụ tải về thư viện
- Quản lý dependencies

---

## ✅ Checklist Hoàn Thành

Đánh dấu ✅ khi hoàn thành:

- [ ] Cài Node.js thành công
- [ ] Cài VS Code thành công
- [ ] Setup MongoDB Atlas thành công
- [ ] Cài Git thành công
- [ ] Cài Postman thành công
- [ ] Cài Android Studio (nếu cần)
- [ ] Lấy source code
- [ ] Mở project trong VS Code
- [ ] Cài backend dependencies
- [ ] Cài mobile dependencies
- [ ] Setup .env file
- [ ] Chạy backend thành công (port 5000)
- [ ] Test backend với Postman/Browser
- [ ] Chạy mobile app thành công
- [ ] Thấy app trên simulator/web

---

## 🎯 Bước Tiếp Theo

Sau khi cài xong tất cả:
1. Đọc file `COMPLETE_GUIDE_VI.md`
2. Implement Backend Routes (copy code từ hướng dẫn)
3. Kết nối Mobile với Backend
4. Test tất cả các chức năng
5. Deploy app

---

**Nếu gặp vấn đề gì, hãy nói cho tôi biết! 😊**

Bây giờ bạn đã sẵn sàng để làm app Cantea hoàn chỉnh! 🚀
