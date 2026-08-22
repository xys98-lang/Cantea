# 🚀 Push Code Cantea Lên GitHub - Hướng Dẫn Chi Tiết

**Hướng dẫn này cho người không có kinh nghiệm với Git/GitHub**

---

## ❓ Push Code Là Gì?

**Push Code** = Gửi code từ máy tính của bạn lên GitHub (Internet)

Tương tự như:
- 📸 Upload ảnh lên Facebook
- 📹 Upload video lên YouTube
- **Push Code** = Upload code lên GitHub

---

## 📋 Chuẩn Bị

### Bạn Cần:
- ✅ Git cài trên máy (xem hướng dẫn trước)
- ✅ GitHub account (đã tạo)
- ✅ Repository trên GitHub (đã tạo)
- ✅ Code Cantea trên máy
- ✅ VS Code + Terminal

---

## 🎯 5 Bước Push Code

```
1️⃣ Lấy URL Repository GitHub
    ↓
2️⃣ Mở Terminal trong VS Code
    ↓
3️⃣ Initialize Git (lần đầu tiên)
    ↓
4️⃣ Add & Commit Files
    ↓
5️⃣ Push lên GitHub
    ↓
✅ Code được gửi lên GitHub!
```

---

# 📖 BƯỚC 1: Lấy URL Repository GitHub

## Làm Như Thế Nào:

**1️⃣ Mở GitHub:** https://github.com

**2️⃣ Tìm Repository của bạn:**
- Có tên gì? (ví dụ: "Cantea", "highlighter", etc.)

**3️⃣ Click vào Repository**

**4️⃣ Bạn sẽ thấy nút xanh "Code"**

```
┌─────────────────────────────┐
│ YOUR_GITHUB_USERNAME/Cantea│
│                             │
│ [ ← Code ▼ ] [ Share ]      │
└─────────────────────────────┘
       ↑
    CLICK ĐÂY
```

**5️⃣ Click "Code" (nút xanh)**

**6️⃣ Chọn "HTTPS"** (mặc định)

```
┌─ Code ─────────────────────┐
│ ☑️ HTTPS                    │
│ ☐ SSH                       │
│ ☐ GitHub CLI               │
│                             │
│ https://github.com/your...  │
│ [Copy]                      │
└─────────────────────────────┘
```

**7️⃣ Click "Copy"** (sao chép URL)

**8️⃣ URL sẽ như vậy:**

```
https://github.com/your-username/Cantea.git
```

✅ **URL được copy!**

---

# 📂 BƯỚC 2: Mở Terminal Trong VS Code

## Làm Như Thế Nào:

**1️⃣ Mở VS Code**

**2️⃣ File → Open Folder**

**3️⃣ Chọn folder `cantea-project`** (hoặc tên project của bạn)

**4️⃣ Click "Trust the authors"** (nếu hỏi)

**5️⃣ Mở Terminal:**

**Cách 1 - Phím tắt:**
- Windows: `Ctrl + \``
- Mac: `Cmd + \``

**Cách 2 - Menu:**
- Bên trên → View → Terminal

**6️⃣ Terminal sẽ mở ở dưới**

```
┌─ cantea-project ─────────────┐
│ 📁 backend                    │
│ 📁 mobile-app                 │
│ 📄 README.md                  │
│ ...                           │
└──────────────────────────────┘
    ↓ (Terminal mở ở dưới)
┌──────────────────────────────┐
│ > _                           │
│                               │
└──────────────────────────────┘
```

✅ **Terminal mở thành công!**

---

# 🔧 BƯỚC 3: Initialize Git (Lần Đầu)

## Đây Là Bước Quan Trọng!

**Initialize** = Bảo VS Code/Git rằng: "Cái folder này là 1 project, hãy quản lý code của nó"

## Làm Như Thế Nào:

**1️⃣ Trong Terminal, chạy:**

```bash
git config --global user.name "Your Name"
```

Ví dụ:
```bash
git config --global user.name "Nguyen Van A"
```

**2️⃣ Chạy:**

```bash
git config --global user.email "your-email@gmail.com"
```

Ví dụ:
```bash
git config --global user.email "nguyenvana@gmail.com"
```

**3️⃣ Initialize repository:**

```bash
git init
```

**Bạn sẽ thấy:**
```
Initialized empty Git repository in /path/to/cantea-project/.git
```

✅ **Git initialized!**

---

# 📝 BƯỚC 4: Add & Commit Files

## Đây Là Bước Lưu Code

**Add** = Chọn files nào muốn gửi lên GitHub
**Commit** = Lưu trữ (tạo 1 "checkpoint" của code)

## Làm Như Thế Nào:

**1️⃣ Add tất cả files:**

```bash
git add .
```

(Dấu chấm `.` = "Tất cả files")

**Bạn sẽ không thấy output gì, nó là bình thường**

**2️⃣ Commit files:**

```bash
git commit -m "Initial commit: Cantea project setup"
```

**Giải thích:**
- `git commit` = Lưu trữ code
- `-m` = Thêm message (mô tả)
- `"Initial commit..."` = Lời nhắn (gõ tiếng Anh)

**Bạn sẽ thấy:**
```
[main (root-commit) abc1234] Initial commit: Cantea project setup
 25 files changed, 1050 insertions(+)
 create mode 100644 README.md
 ...
```

✅ **Files được commit!**

---

# 🌐 BƯỚC 5: Connect Với GitHub & Push

## Làm Như Thế Nào:

**1️⃣ Add remote repository:**

```bash
git remote add origin https://github.com/your-username/Cantea.git
```

**Thay:**
- `your-username` → username GitHub của bạn
- `Cantea` → tên repository của bạn

**Ví dụ:**
```bash
git remote add origin https://github.com/nguyenvana/Cantea.git
```

**Bạn sẽ không thấy output, nó là bình thường**

**2️⃣ Đặt branch mặc định:**

```bash
git branch -M main
```

**3️⃣ Push code lên GitHub:**

```bash
git push -u origin main
```

**Nó sẽ hỏi:**
```
Username for 'https://github.com': 
```

**Gõ username GitHub của bạn:**
```
your-username
```

**Sau đó hỏi:**
```
Password for 'https://your-username@github.com': 
```

**⚠️ KHÔNG GÕ MẬT KHẨU GMAIL!** Gõ **Personal Access Token** thay vào:

---

# 🔐 Tạo Personal Access Token

## Nếu GitHub Hỏi Mật Khẩu:

**GitHub không cho phép dùng mật khẩu thường để push code. Bạn cần Personal Access Token.**

### Cách Tạo:

**1️⃣ Vào GitHub Settings:**
```
https://github.com/settings/tokens
```

**2️⃣ Click "Generate new token"** (bên phải)

**3️⃣ Chọn "Generate new token (classic)"**

**4️⃣ Điền thông tin:**

```
Token name: "My Development Token"
Expiration: 90 days (hoặc không hết hạn)
```

**5️⃣ Chọn scopes (quyền):**

Tích các hộp:
- ✅ `repo` (full control of private repositories)
- ✅ `workflow` (update GitHub Action and workflow files)

**6️⃣ Click "Generate token"** (nút xanh)

**7️⃣ Copy token:**

```
ghp_1234567890abcdefghijklmnopqrst...
```

**⚠️ LƯU Ý: Chỉ hiện 1 lần! Copy ngay!**

**8️⃣ Paste token vào Terminal:**

Khi Terminal hỏi `Password`, paste token này vào (không hiển thị text, là bình thường)

---

# ✅ Hoàn Thành Push!

## Bạn Sẽ Thấy:

```
Enumerating objects: 25, done.
Counting objects: 100% (25/25), done.
Delta compression using up to 8 threads
Compressing objects: 100% (20/20), done.
Writing objects: 100% (25/25), 52.34 KiB | 1.23 MiB/s, done.
Total 25 (delta 0), reused 0 (delta 0), pack-reused 0
To https://github.com/your-username/Cantea.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

✅ **Code được push lên GitHub thành công!**

---

# 🎉 Xác Nhận Trên GitHub

## Kiểm Tra:

**1️⃣ Mở GitHub:** https://github.com/your-username/Cantea

**2️⃣ Bạn sẽ thấy:**

```
┌─ Cantea ──────────────────────┐
│ 📁 backend                     │
│ 📁 mobile-app                  │
│ 📄 README.md                   │
│ 📄 .gitignore                  │
│ 📄 docker-compose.yml          │
│ ...                            │
│                                │
│ "Initial commit" (bên phải)    │
└────────────────────────────────┘
```

✅ **Tất cả files có trên GitHub!**

---

# 📋 Checklist Hoàn Thành

- [ ] Lấy URL Repository GitHub
- [ ] Mở Terminal trong VS Code
- [ ] Setup Git (user.name, user.email)
- [ ] git init
- [ ] git add .
- [ ] git commit -m "..."
- [ ] git remote add origin https://...
- [ ] git branch -M main
- [ ] git push -u origin main
- [ ] Xác nhận code trên GitHub

✅ **Tất cả xong!**

---

# 🔄 Lần Sau Push Code (Dễ Hơn)

Lần sau khi code mới, chỉ cần 3 bước:

```bash
git add .
git commit -m "Fix bug / Add feature"
git push
```

Xong! Không cần tất cả 9 bước nữa.

---

# 📞 Troubleshooting

### Lỗi 1: "fatal: not a git repository"

```
❌ Lỗi: Folder này không phải git project
```

**Fix:**
- Chạy: `git init` (trong folder gốc)

### Lỗi 2: "remote origin already exists"

```
❌ Lỗi: GitHub URL đã được add rồi
```

**Fix:**
- Chạy: `git remote remove origin`
- Sau đó: `git remote add origin https://...`

### Lỗi 3: "Authentication failed"

```
❌ Lỗi: Username/token sai
```

**Fix:**
- Kiểm tra username đúng chưa
- Kiểm tra token còn hạn không
- Tạo token mới

### Lỗi 4: "Permission denied (publickey)"

```
❌ Lỗi: SSH key không được setup
```

**Fix:**
- Dùng HTTPS thay vì SSH
- URL phải là: `https://github.com/...` (không `git@github.com:...`)

---

# 🎯 Bước Tiếp Theo

Sau khi push code xong:

1. ✅ Code trên GitHub
2. ➡️ **Clone code xuống (nếu cần)**
3. ➡️ **Setup environment (.env)**
4. ➡️ **Cài dependencies (npm install)**
5. ➡️ **Chạy Backend (npm run dev)**
6. ➡️ **Chạy Mobile (npm start)**

---

**Nếu gặp vấn đề, hãy nói cho tôi biết!** 🚀
