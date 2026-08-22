# 👤 Tạo Database User Trong MongoDB Atlas

**Hướng dẫn chi tiết từng bước cách tạo Database User**

---

## ❓ Database User Là Gì?

**Database User** là tài khoản để app kết nối tới MongoDB.

Tương tự như:
- 🔐 Username/Password để đăng nhập Gmail
- 🔑 Username/Password để đăng nhập Facebook
- **Database User** = Username/Password để kết nối MongoDB

---

## 📋 Thông Tin Bạn Sẽ Tạo

| Thông Tin | Giá Trị | Ghi Chú |
|-----------|--------|--------|
| **Username** | cantea_user | Tên đăng nhập |
| **Password** | Cantea@2024 | Mật khẩu mạnh |
| **Method** | Password | Cách xác thực |

---

## 🚀 BƯỚC 1: Đăng Nhập MongoDB Atlas

### Làm Như Thế Nào:

**1️⃣ Mở trình duyệt**

**2️⃣ Truy cập:** https://www.mongodb.com/cloud/atlas

**3️⃣ Click "Log In"** (nếu chưa đăng nhập)

**4️⃣ Nhập:**
- Email: your-email@gmail.com
- Password: (mật khẩu MongoDB Account)

**5️⃣ Click "Log In"**

✅ **Bạn đã đăng nhập!**

---

## BƯỚC 2: Đi Tới Database Access

### Menu Trái Sẽ Hiển Thị:

```
┌─ MongoDB Atlas ────────────────┐
│ Organization: Cantea          │
│                                │
│ 📊 Dashboard                   │
│ 🔐 Database Access      ←CLICK │
│ 🌐 Network Access              │
│ 🚀 Data Services               │
│ 📊 Database                    │
│ ⚙️  Settings                   │
│                                │
└────────────────────────────────┘
```

### Cách Làm:

**1️⃣ Nhìn vào bên trái**

**2️⃣ Tìm dòng "Database Access"**

**3️⃣ Click vào dòng đó**

**Chờ 3 giây...**

✅ **Bạn đã mở Database Access!**

---

## BƯỚC 3: Nhìn Thấy Danh Sách Users

### Bạn Sẽ Thấy:

```
┌─ Database Users ───────────────┐
│                                │
│ [ + Add New Database User ]    │
│                                │
│ (Không có user nào hoặc        │
│  danh sách user cũ)            │
│                                │
└────────────────────────────────┘
```

### Giải Thích:

- **+ Add New Database User** = Nút để thêm user mới
- Danh sách bên dưới = Những user đã tạo (nếu có)

---

## BƯỚC 4: Click "Add New Database User"

### Làm Như Thế Nào:

**1️⃣ Click nút xanh "+ Add New Database User"**

**2️⃣ Dialog sẽ hiển thị:**

```
┌─ Create Database User ─────────┐
│                                │
│ Authentication Method:         │
│                                │
│ ☑️ Password                    │
│    (được chọn sẵn)             │
│                                │
│ ☐ LDAP/X.509                  │
│                                │
│ Username:                      │
│ [___________________________]  │
│                                │
│ Password:                      │
│ [___________________________]  │
│                                │
│ Confirm Password:              │
│ [___________________________]  │
│                                │
│ Database User Privileges:      │
│ [Read and write to any...]     │
│                                │
│ [ Add User ]                   │
│                                │
└────────────────────────────────┘
```

✅ **Dialog mở thành công!**

---

## BƯỚC 5: Chọn Authentication Method

### Authentication Method Là Gì?

**Authentication Method** = Cách để xác nhận bạn là ai

| Method | Giải Thích | Ưu Điểm |
|--------|-----------|---------|
| **Password** ✅ | Dùng username + password | Dễ, phổ biến |
| **LDAP/X.509** | Dùng chứng chỉ | An toàn hơn |

### Cách Làm:

**1️⃣ Kiểm tra:**
- ☑️ **Password** đã được tích chưa?

**2️⃣ Nếu chưa, click vào hộp "Password"**
- Nó sẽ được tích ☑️

✅ **Method được chọn!**

---

## BƯỚC 6: Nhập Username

### Username Là Gì?

**Username** = Tên đăng nhập vào MongoDB

Ví dụ:
- Gmail: alice@gmail.com
- Facebook: alice_123
- **MongoDB**: cantea_user

### Cách Làm:

**1️⃣ Click vào ô "Username"**

**2️⃣ Xóa sạch nếu có chữ (Ctrl+A → Delete)**

**3️⃣ Gõ:**
```
cantea_user
```

**4️⃣ Kiểm tra lại:**
- ✅ Không có khoảng trắng
- ✅ Không có ký tự đặc biệt
- ✅ Đúng: `cantea_user`

✅ **Username nhập thành công!**

---

## BƯỚC 7: Nhập Password

### Password Là Gì?

**Password** = Mật khẩu

Phải **mạnh**:
- ✅ Ít 8 ký tự
- ✅ Có số
- ✅ Có chữ hoa
- ✅ Có ký tự đặc biệt (@, #, $, etc.)

### Cách Làm:

**1️⃣ Click vào ô "Password"**

**2️⃣ Gõ:**
```
Cantea@2024
```

**Giải thích:**
- `Cantea` = Chữ hoa + chữ thường
- `@` = Ký tự đặc biệt
- `2024` = Số
- **Tổng:** 12 ký tự ✅ Mạnh!

**3️⃣ Kiểm tra lại:**
- ✅ Đúng: `Cantea@2024`

✅ **Password nhập thành công!**

---

## BƯỚC 8: Xác Nhận Password

### Xác Nhận Là Gì?

**Xác Nhận** = Gõ lại password để đảm bảo bạn gõ đúng

### Cách Làm:

**1️⃣ Click vào ô "Confirm Password"**

**2️⃣ Gõ lại:**
```
Cantea@2024
```

**Phải giống hệt ở trên!**

**3️⃣ Kiểm tra:**
- ✅ Password và Confirm Password giống nhau

✅ **Confirm Password nhập thành công!**

---

## BƯỚC 9: Chọn Privileges (Quyền)

### Privileges Là Gì?

**Privileges** = Quyền gì được làm với database

| Quyền | Ý Nghĩa |
|-------|---------|
| **Read** | Chỉ đọc dữ liệu |
| **Write** | Chỉ ghi/thêm dữ liệu |
| **Read and Write** ✅ | Đọc + ghi dữ liệu |

### Cách Làm:

**1️⃣ Click dropdown "Database User Privileges"**

```
┌─ Dropdown ─────────────────┐
│ ☑️ Read and write to       │
│    any database            │
└────────────────────────────┘
```

**2️⃣ Chọn:**
```
☑️ Read and write to any database
```

**(Nó thường được chọn sẵn)**

✅ **Privileges được chọn!**

---

## BƯỚC 10: Kiểm Tra Lại Tất Cả

### Checklist Trước Khi Click "Add User":

```
☑️ Authentication Method: Password
☑️ Username: cantea_user
☑️ Password: Cantea@2024
☑️ Confirm: Cantea@2024
☑️ Privileges: Read and write to any database
```

**Tất cả đúng chưa?** ✅ Có → Tiếp tục

---

## BƯỚC 11: Click "Add User"

### Làm Như Thế Nào:

**1️⃣ Nhìn xuống dưới cùng dialog**

**2️⃣ Tìm nút xanh "Add User"**

**3️⃣ Click vào nó**

**Chờ 3-5 giây...**

```
⏳ Creating user... please wait
```

✅ **Nút được click!**

---

## BƯỚC 12: Xác Nhận Tạo Thành Công

### Bạn Sẽ Thấy:

```
┌─ Success Message ──────────────┐
│ ✅ Database user created      │
│    successfully               │
│                               │
│ Username: cantea_user        │
│ Status: Active                │
└───────────────────────────────┘
```

**Hoặc bạn sẽ thấy user trong danh sách:**

```
┌─ Database Users ───────────────┐
│                                │
│ [ + Add New Database User ]    │
│                                │
│ User: cantea_user             │
│ Status: Active ✅              │
│ Privileges: Read & Write       │
│ Database: Any                  │
│                                │
└────────────────────────────────┘
```

✅ **Database User tạo thành công!**

---

## 🎉 Chúc Mừng!

Bạn đã tạo Database User với:

| Thông Tin | Giá Trị |
|-----------|--------|
| **Username** | cantea_user |
| **Password** | Cantea@2024 |
| **Status** | Active ✅ |
| **Privileges** | Read & Write |

---

## 📝 Ghi Nhớ Thông Tin

**Bạn nên ghi nhớ:**

```
📌 Username: cantea_user
📌 Password: Cantea@2024
📌 Dùng để: Kết nối MongoDB từ app
```

**Hoặc ghi vào giấy nếu quên!**

---

## 🔧 Sử Dụng Database User

### Khi Nào Dùng?

**Database User được dùng trong Connection String:**

```
mongodb+srv://cantea_user:Cantea@2024@cluster0.xxxxx.mongodb.net/...
                ↑              ↑
             username       password
```

### Ở Đâu?

**File `.env` trong folder `backend/`:**

```
MONGODB_URI=mongodb+srv://cantea_user:Cantea@2024@...
```

---

## ❌ Sai Lầm Thường Gặp

| Sai Lầm | Kết Quả | Cách Fix |
|---------|---------|---------|
| Gõ sai username | Lỗi auth | Kiểm tra `cantea_user` |
| Gõ sai password | Lỗi auth | Kiểm tra `Cantea@2024` |
| Quên gõ ký tự đặc biệt | Password yếu | Thêm `@` |
| Username có khoảng | Lỗi format | Xóa khoảng |
| Chọn sai privileges | Lỗi quyền | Chọn "Read & Write" |

---

## 🔐 Bảo Mật - Điều Cần Biết

**⚠️ Quan Trọng:**

1. **Đừng chia sẻ password** với ai
   - ❌ Đừng post lên internet
   - ❌ Đừng gửi qua email không bảo mật
   - ✅ Giữ riêng tư

2. **Đừng commit .env vào Git**
   - ❌ Đừng push file `.env`
   - ✅ Thêm `.env` vào `.gitignore`

3. **Nếu quên password**
   - Đi Database Access
   - Chọn user
   - Click "Reset Password"
   - Tạo password mới

---

## 📞 Lỗi & Fix

### Lỗi 1: "Username already exists"

```
❌ Lỗi: Username đã được sử dụng
```

**Fix:**
- Chọn username khác, ví dụ: `cantea_user_2`
- Hoặc xóa user cũ rồi tạo lại

### Lỗi 2: "Password too weak"

```
❌ Lỗi: Mật khẩu không đủ mạnh
```

**Fix:**
- Thêm ký tự đặc biệt (@, #, $)
- Thêm số
- Thêm chữ hoa
- Tối thiểu 8 ký tự

### Lỗi 3: "Authentication failed"

```
❌ Lỗi: Không thể xác thực
```

**Fix:**
- Kiểm tra username đúng: `cantea_user`
- Kiểm tra password đúng: `Cantea@2024`
- Kiểm tra user active: Status = "Active"

---

## ✅ Checklist Hoàn Thành

- [ ] Đăng nhập MongoDB Atlas
- [ ] Đi tới Database Access
- [ ] Click "Add New Database User"
- [ ] Chọn "Password" method
- [ ] Nhập username: cantea_user
- [ ] Nhập password: Cantea@2024
- [ ] Xác nhận password
- [ ] Chọn privileges: Read & Write
- [ ] Click "Add User"
- [ ] Thấy user trong danh sách
- [ ] Ghi nhớ username & password

---

## 🎯 Bước Tiếp Theo

Sau khi tạo Database User:

1. ✅ Database User tạo xong
2. ➡️ **Thêm IP Whitelist** (Network Access)
3. ➡️ **Copy Connection String**
4. ➡️ **Lưu vào .env**
5. ➡️ **Test kết nối backend**

---

**Nếu gặp vấn đề, hãy nói cho tôi biết!** 🚀
