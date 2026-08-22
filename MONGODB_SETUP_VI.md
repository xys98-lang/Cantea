# 🗄️ MongoDB - Hướng Dẫn Chi Tiết Cài Đặt

**Hướng dẫn này dành cho người không có kinh nghiệm.**

---

## ❓ MongoDB Là Gì?

**MongoDB** là nơi lưu trữ dữ liệu của app.

Tương tự như:
- 📊 Excel - lưu dữ liệu dạng bảng
- 🗂️ Thư mục file - lưu file
- **MongoDB** - lưu dữ liệu cho app

Với app Cantea, MongoDB sẽ lưu trữ:
- 👤 Thông tin user (email, password, profile)
- 📚 Lịch học (courses)
- 📊 Điểm số (grades)
- 💬 Bài viết (posts)
- 📖 Danh sách sách (listings)

---

## 🎯 2 Cách Cài MongoDB

| Cách | Ưu Điểm | Nhược Điểm |
|------|---------|-----------|
| **MongoDB Local** | Nhanh, offline, local | Khó cài, phức tạp |
| **MongoDB Atlas** ⭐ | Dễ, trên cloud, miễn phí | Cần internet |

**Chúng ta sẽ dùng MongoDB Atlas** - dễ hơn, không cần cài trên máy.

---

# 📖 HƯỚNG DẪN CÀI MONGODB ATLAS

## BƯỚC 1: Mở Trình Duyệt & Truy Cập MongoDB

### Làm Như Thế Nào:

**1️⃣ Mở trình duyệt bất kỳ:**
- Chrome
- Firefox
- Safari
- Edge

**2️⃣ Vào thanh URL (chỗ gõ website):**

```
https://www.mongodb.com/cloud/atlas
```

**3️⃣ Nhấn Enter**

---

## BƯỚC 2: Nhìn Thấy Trang MongoDB

### Bạn Sẽ Thấy:

```
┌─────────────────────────────────────┐
│   MongoDB                           │
│   Atlas                             │
│   The Developer Data Platform       │
│                                     │
│   [ Try Free ]                      │
└─────────────────────────────────────┘
```

### Làm Tiếp:

**Click nút xanh "Try Free"**

---

## BƯỚC 3: Tạo Tài Khoản

### Bạn Sẽ Thấy Form:

```
┌─ Sign Up ─────────────────────────┐
│ Email:          [_______________] │
│ Password:       [_______________] │
│ Confirm Pass:   [_______________] │
│                                   │
│ ☑️ I agree to the...              │
│                                   │
│         [ Sign Up ]               │
└───────────────────────────────────┘
```

### Cách Điền:

**1️⃣ Email:**
- Dùng Gmail của bạn
- Ví dụ: `your-email@gmail.com`
- Click vào ô → Gõ email

**2️⃣ Password:**
- Gõ mật khẩu mạnh
- Ít 8 ký tự
- Có số, chữ hoa, ký tự đặc biệt
- Ví dụ: `Cantea@2024`

**3️⃣ Confirm Password:**
- Gõ lại mật khẩu ở trên
- Phải giống hệt

**4️⃣ Checkbox:**
- ☑️ Tích vào "I agree to..."

**5️⃣ Click "Sign Up"**

---

## BƯỚC 4: Xác Nhận Email

### MongoDB Sẽ Gửi Email

**Bạn sẽ nhận email:** 

```
From: MongoDB <noreply@mongodb.com>
Subject: Please verify your email address
```

### Cách Xác Nhận:

**1️⃣ Mở Gmail**

**2️⃣ Tìm email từ MongoDB**
- Vào Inbox
- Nhìn tìm: "Please verify your email"

**3️⃣ Click link trong email**
- Nó sẽ chứa link
- Ví dụ: `https://account.mongodb.com/account/verify/...`

**4️⃣ Bạn sẽ được đưa về trang MongoDB**

**5️⃣ Nhấn "Continue"** (hoặc tương tự)

✅ **Email xác nhận thành công!**

---

## BƯỚC 5: Tạo Organization

### Bạn Sẽ Thấy:

```
┌─ Create Organization ──────────┐
│ Organization Name:             │
│ [_____________________]         │
│                                │
│ [ Create Organization ]        │
└────────────────────────────────┘
```

### Cách Làm:

**1️⃣ Click vào ô Organization Name**

**2️⃣ Gõ:** 
```
Cantea
```

**3️⃣ Click "Create Organization"**

**Chờ 5 giây...**

✅ **Organization tạo xong!**

---

## BƯỚC 6: Tạo Project

### Bạn Sẽ Thấy:

```
┌─ New Project ──────────────────┐
│ Project Name:                  │
│ [_____________________]         │
│                                │
│ [ Create Project ]             │
└────────────────────────────────┘
```

### Cách Làm:

**1️⃣ Gõ Project Name:**
```
Cantea
```

**2️⃣ Click "Create Project"**

**Chờ 5 giây...**

✅ **Project tạo xong!**

---

## BƯỚC 7: Tạo Cluster (Database)

### Đây Là Bước Quan Trọng!

Bạn sẽ thấy:

```
┌─ Create Your Database ─────────┐
│ Choose a deployment option:    │
│                                │
│ ☐ Shared (Miễn phí) ← CHỌN CÁI NÀY
│ ☐ Dedicated                    │
│                                │
│ [ Create ]                     │
└────────────────────────────────┘
```

### Cách Làm:

**1️⃣ Chọn "Shared"** (bên trái)
- Click vào hộp tròn
- ☑️ Nó sẽ được tích

**2️⃣ Click "Create"** (nút xanh)

**Chờ 10-15 giây...**

---

## BƯỚC 8: Chọn Provider & Region

### Bạn Sẽ Thấy:

```
┌─ Create Shared Cluster ────────┐
│ Cloud Provider: [AWS ▼]        │
│                                │
│ Region: [Singapore ▼]          │
│         (gần Việt Nam)          │
│                                │
│ Tier: M0 (Miễn phí)            │
│                                │
│ [ Create Cluster ]             │
└────────────────────────────────┘
```

### Cách Làm:

**1️⃣ Provider:**
- Để mặc định: **AWS** ✅

**2️⃣ Region:**
- Click dropdown: **"Singapore"** ✅
- (Gần Việt Nam, nhanh nhất)

**3️⃣ Tier:**
- Để **M0 (Miễn phí)** ✅

**4️⃣ Click "Create Cluster"** (nút xanh)

**Chờ 5-10 phút...**

⏳ *Màn hình sẽ thể hiện tiến độ cài đặt*

---

## BƯỚC 9: Tạo Database User

### Sau Khi Cluster Tạo Xong, Bạn Sẽ Thấy:

Ở bên trái có menu:

```
📊 Dashboard
🔐 Database Access      ← CLICK CÁI NÀY
🌐 Network Access
🚀 Data Services
...
```

### Cách Làm:

**1️⃣ Click "Database Access"** (bên trái)

**2️⃣ Bạn sẽ thấy:**

```
┌─ Database Users ────────────────┐
│ [ + Add New Database User ]     │
│                                 │
│ (Không có user nào)             │
└─────────────────────────────────┘
```

**3️⃣ Click "+ Add New Database User"**

**4️⃣ Form sẽ hiển thị:**

```
┌─ Create Database User ─────────┐
│ Authentication Method:         │
│ ☑️ Password (được chọn)         │
│                                │
│ Username: [_______________]    │
│ Password: [_______________]    │
│ Confirm:  [_______________]    │
│                                │
│ [ Add User ]                   │
└────────────────────────────────┘
```

### Điền Thông Tin:

**Username:**
```
cantea_user
```

**Password:**
```
Cantea@2024
```

**Ghi nhớ cái này! ⭐** Chúng ta sẽ dùng sau!

**5️⃣ Click "Add User"**

✅ **User tạo xong!**

---

## BƯỚC 10: Thêm IP Address (Network Access)

### Tại Sao Cần Bước Này?

Để app của bạn có thể kết nối đến MongoDB.

### Cách Làm:

**1️⃣ Bên trái, click "Network Access"**

```
Menu Trái:
📊 Dashboard
🔐 Database Access
🌐 Network Access    ← CLICK ĐÂY
🚀 Data Services
```

**2️⃣ Bạn sẽ thấy:**

```
┌─ IP Whitelist ──────────────────┐
│ [ + Add IP Address ]            │
│                                 │
│ (Không có IP nào)               │
└─────────────────────────────────┘
```

**3️⃣ Click "+ Add IP Address"**

**4️⃣ Dialog sẽ hiển thị:**

```
┌─ Add IP Address ──────────────┐
│ Which IP addresses would you   │
│ like to add?                   │
│                                │
│ ☐ Access from anywhere         │
│   (Cho phép tất cả IP)          │
│                                │
│ ☑️ (Để mặc định)               │
│                                │
│ [ Confirm ]                    │
└────────────────────────────────┘
```

**5️⃣ Chọn "Access from Anywhere"**

**6️⃣ Click "Confirm"**

⏳ **Chờ 1-2 phút...**

✅ **IP Address thêm xong!**

---

## BƯỚC 11: Lấy Connection String

### Đây Là Bước Quan Trọng Nhất!

Connection String là cái để app kết nối với MongoDB.

### Cách Lấy:

**1️⃣ Bên trái, click "Database"**

```
Menu Trái:
📊 Dashboard
🔐 Database Access
🌐 Network Access
🚀 Data Services
📊 Database        ← CLICK ĐÂY
```

**2️⃣ Bạn sẽ thấy cluster:**

```
┌─ Clusters ──────────────────────┐
│ Cluster 0                       │
│ [Status: Running ✓]             │
│ [ Connect ]                     │
│                                 │
│ Region: Singapore               │
│ Tier: M0                        │
└─────────────────────────────────┘
```

**3️⃣ Click nút "Connect"** (xanh)

**4️⃣ Chọn "Drivers"**

```
Dialog sẽ hiển thị 3 tuỳ chọn:
☐ Compass
☐ Drivers         ← CLICK ĐÂY
☐ Command Line
```

**5️⃣ Chọn "Node.js"**

```
Driver:  [Node.js ▼]
Version: [5.9.0 ▼]
```

**6️⃣ Bạn sẽ thấy Connection String:**

```
mongodb+srv://cantea_user:<password>@cluster0.xxxxx.mongodb.net/myFirstDatabase?retryWrites=true&w=majority
```

### ⭐ COPY Connection String Này!

**7️⃣ Copy toàn bộ connection string:**

```bash
mongodb+srv://cantea_user:Cantea@2024@cluster0.xxxxx.mongodb.net/myFirstDatabase?retryWrites=true&w=majority
```

**Ctrl+C** (Windows) hoặc **Cmd+C** (Mac)

---

## BƯỚC 12: Dùng Connection String

### Lưu Connection String Vào File .env

**1️⃣ Mở VS Code**

**2️⃣ Mở project `cantea-project`**

**3️⃣ Đi vào folder `backend`**

**4️⃣ Mở file `.env`**

```
backend/
├── .env.example
├── .env          ← OPEN THIS
├── package.json
└── ...
```

**5️⃣ Tìm dòng:**

```
MONGODB_URI=mongodb://localhost:27017/cantea
```

**6️⃣ Thay bằng:**

```
MONGODB_URI=mongodb+srv://cantea_user:Cantea@2024@cluster0.xxxxx.mongodb.net/myFirstDatabase?retryWrites=true&w=majority
```

**7️⃣ Lưu file:** `Ctrl+S` (Windows) hoặc `Cmd+S` (Mac)

✅ **Connection String lưu thành công!**

---

## BƯỚC 13: Test Kết Nối

### Kiểm Tra Có Kết Nối Được Không

**1️⃣ Trong VS Code, mở Terminal**

```
Ctrl+` (backtick)
```

**2️⃣ Chạy backend:**

```bash
cd backend
npm run dev
```

**3️⃣ Nhìn output, nên thấy:**

```
✅ MongoDB connected successfully
🚀 Cantea Backend running on port 5000
📍 API URL: http://localhost:5000
```

✅ **MongoDB kết nối thành công!**

---

## 🎉 Chúc Mừng!

Bạn đã:
- ✅ Tạo tài khoản MongoDB Atlas
- ✅ Tạo Organization & Project
- ✅ Tạo Cluster (Database)
- ✅ Tạo Database User
- ✅ Setup Network Access
- ✅ Lấy Connection String
- ✅ Lưu vào file .env
- ✅ Test kết nối

**Bây giờ app có thể lưu trữ dữ liệu!**

---

## 🔍 Cách Kiểm Tra Dữ Liệu

### Dùng MongoDB Compass (Optional)

**MongoDB Compass** là công cụ để xem dữ liệu trong MongoDB.

### Cách Cài & Dùng:

**1️⃣ Mở https://www.mongodb.com/products/compass**

**2️⃣ Click "Download Compass"**

**3️⃣ Cài đặt như bình thường**

**4️⃣ Mở Compass**

**5️⃣ Click "New Connection"**

**6️⃣ Paste Connection String:**

```
mongodb+srv://cantea_user:Cantea@2024@cluster0.xxxxx.mongodb.net/myFirstDatabase
```

**7️⃣ Click "Connect"**

**Bạn sẽ thấy database & collections!**

---

## 📞 Troubleshooting

### Lỗi 1: "Authentication failed"

```
❌ Lỗi: MongoDB không nhận password
```

**Fix:**
- Kiểm tra username: `cantea_user` ✓
- Kiểm tra password: `Cantea@2024` ✓
- Nếu sai → Đi Database Access → Edit user

### Lỗi 2: "Server selection timed out"

```
❌ Lỗi: Không thể kết nối đến MongoDB
```

**Fix:**
- Kiểm tra internet có chạy không
- Kiểm tra IP whitelist (Network Access)
- Kiểm tra Connection String đúng không

### Lỗi 3: "Cannot connect to MongoDB"

```
❌ Lỗi: Backend không kết nối được
```

**Fix:**
- Kiểm tra .env file có MONGODB_URI không
- Kiểm tra Connection String đúng không
- Restart backend: `Ctrl+C` rồi `npm run dev` lại

### Lỗi 4: "Wrong connection string"

```
❌ Lỗi: Connection string format sai
```

**Fix:**
- Lấy lại từ MongoDB Atlas
- Đảm bảo có:
  - `mongodb+srv://` (đầu)
  - `cantea_user:Cantea@2024` (user:pass)
  - `.mongodb.net/` (domain)

---

## 📋 Checklist

- [ ] Tạo tài khoản MongoDB Atlas
- [ ] Tạo Organization "Cantea"
- [ ] Tạo Project "Cantea"
- [ ] Tạo Cluster (Shared, AWS, Singapore)
- [ ] Tạo Database User (cantea_user)
- [ ] Thêm IP Whitelist
- [ ] Copy Connection String
- [ ] Lưu vào file .env
- [ ] Test kết nối (chạy backend)
- [ ] Thấy "MongoDB connected successfully"

---

## 🎯 Bước Tiếp Theo

Sau khi MongoDB setup xong:
1. Chạy Backend
2. Chạy Mobile App
3. Test các chức năng
4. Implement Routes

---

**Nếu gặp vấn đề gì, hãy nói cho tôi biết!** 🚀
