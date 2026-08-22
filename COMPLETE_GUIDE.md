# 🚀 Cantea - Hướng Dẫn Phát Triển Hoàn Chỉnh

Hướng dẫn chi tiết từng bước để xây dựng ứng dụng Cantea từ A đến Z.

---

## 📋 Mục Lục

1. [Chuẩn Bị Môi Trường](#-chuẩn-bị-môi-trường)
2. [Cài Đặt & Chạy Backend](#-cài-đặt--chạy-backend)
3. [Cài Đặt & Chạy Mobile App](#-cài-đặt--chạy-mobile-app)
4. [Implement Backend Routes](#-implement-backend-routes)
5. [Kết Nối Mobile với Backend](#-kết-nối-mobile-với-backend)
6. [Testing & Debug](#-testing--debug)
7. [Deployment](#-deployment)

---

## 🖥️ Chuẩn Bị Môi Trường

### Các Tool Cần Cài Đặt

#### 1. **Node.js & npm**
```bash
# Download từ https://nodejs.org/ (LTS version 18+)

# Verify installation
node --version    # v18.x.x
npm --version     # 9.x.x
```

#### 2. **MongoDB**

**Option A: Local MongoDB (macOS)**
```bash
brew install mongodb-community
brew services start mongodb-community

# Verify
mongosh  # Should connect to MongoDB
```

**Option B: MongoDB Atlas (Cloud - Recommended)**
1. Đi tới https://www.mongodb.com/cloud/atlas
2. Tạo tài khoản miễn phí
3. Tạo cluster
4. Lấy connection string
5. Sử dụng trong `.env`

#### 3. **Git**
```bash
# Download từ https://git-scm.com/

# Verify
git --version
```

#### 4. **Visual Studio Code**
- Download từ https://code.visualstudio.com/
- Install React Native Tools extension
- Install MongoDB extension (optional)

#### 5. **Postman (API Testing)**
- Download từ https://www.postman.com/

#### 6. **Android Studio / Xcode (Mobile)**

**Cho Android:**
```bash
# Install Android Studio từ https://developer.android.com/studio
# Setup Android Emulator
```

**Cho iOS (macOS only):**
```bash
# Install Xcode từ App Store
# Hoặc từ terminal:
xcode-select --install
```

---

## 🔧 Cài Đặt & Chạy Backend

### Bước 1: Clone/Copy Project
```bash
# Navigate to your projects folder
cd ~/projects
cp -r /path/to/cantea-project ./
cd cantea-project/backend
```

### Bước 2: Install Dependencies
```bash
npm install

# Hoặc nếu có issues:
rm -rf node_modules package-lock.json
npm install
```

### Bước 3: Setup Environment Variables
```bash
# Copy env template
cp .env.example .env

# Edit .env file
nano .env  # Hoặc dùng VS Code
```

**Cập nhật những dòng này trong .env:**
```bash
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cantea

# Hoặc nếu dùng MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cantea

JWT_SECRET=your-super-secret-key-12345
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-secret
```

### Bước 4: Test Database Connection
```bash
# Nếu dùng local MongoDB:
mongosh  # Mở connection

# Hoặc verify MongoDB running:
# macOS
brew services list | grep mongodb

# Linux
sudo systemctl status mongod
```

### Bước 5: Start Backend Server
```bash
npm run dev

# Output nên thấy:
# ✅ MongoDB connected successfully
# 🚀 Cantea Backend running on port 5000
# 📍 API URL: http://localhost:5000
```

### Bước 6: Test Backend
```bash
# Trong terminal mới, test health endpoint:
curl http://localhost:5000/api/health

# Output:
# {"status":"OK","timestamp":"2024-08-21T..."}
```

✅ **Backend chạy thành công!**

---

## 📱 Cài Đặt & Chạy Mobile App

### Bước 1: Install Expo CLI
```bash
npm install -g expo-cli

# Verify
expo --version
```

### Bước 2: Install Dependencies
```bash
cd ../mobile-app
npm install

# Nếu có issues:
rm -rf node_modules package-lock.json
npm install
```

### Bước 3: Start Expo Server
```bash
npm start

# Output:
# ➜  Expo Go app này
# ➜  Press 'i' for iOS simulator
# ➜  Press 'a' for Android emulator
# ➜  Press 'w' for web browser
```

### Bước 4: Chạy trên Simulator/Emulator

**iOS Simulator (macOS):**
```bash
# Từ Expo menu, nhấn 'i'
# Hoặc:
npm run ios
```

**Android Emulator:**
```bash
# Mở Android Studio trước, start emulator
# Từ Expo menu, nhấn 'a'
# Hoặc:
npm run android
```

**Web Browser:**
```bash
# Từ Expo menu, nhấn 'w'
# Hoặc:
npm run web
```

✅ **Mobile app chạy thành công!**

---

## 🛣️ Implement Backend Routes

### Bước 1: Tạo Auth Routes

Tạo file `backend/src/routes/authRoutes.js`:
```javascript
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { loginUser, registerUser, logoutUser } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', loginUser);
router.post('/register', registerUser);
router.post('/logout', protect, logoutUser);
router.get('/me', protect, (req, res) => {
  res.json({ user: req.user });
});

export default router;
```

### Bước 2: Tạo Auth Controller

Tạo file `backend/src/controllers/authController.js`:
```javascript
import User from '../models/User.js';
import { generateToken } from '../middleware/authMiddleware.js';
import { AppError } from '../middleware/errorHandler.js';

export const registerUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, universityEmail } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Get university from email
    const emailDomain = universityEmail.split('@')[1];
    const universityMap = {
      'student.rmit.edu.vn': 'RMIT Vietnam',
      'student.hcmuaf.edu.vn': 'Saigon University',
      'student.uel.edu.vn': 'UEH',
    };
    const university = universityMap[emailDomain] || 'Other';

    // Create user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      universityEmail,
      university,
    });

    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: user.getPublicProfile(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user._id);
    user.lastLogin = new Date();
    await user.save();

    res.json({
      message: 'Login successful',
      token,
      user: user.getPublicProfile(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const logoutUser = async (req, res) => {
  res.json({ message: 'Logged out successfully' });
};
```

### Bước 3: Tạo Grade Routes & Controller

Tạo file `backend/src/routes/gradeRoutes.js`:
```javascript
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getGrades,
  addGrade,
  updateGrade,
  getGradeSummary,
} from '../controllers/gradeController.js';

const router = express.Router();

router.get('/', protect, getGrades);
router.post('/', protect, addGrade);
router.put('/:id', protect, updateGrade);
router.get('/summary/:semester', protect, getGradeSummary);

export default router;
```

Tạo file `backend/src/controllers/gradeController.js`:
```javascript
import Grade from '../models/Grade.js';

export const addGrade = async (req, res) => {
  try {
    const { courseName, courseCode, semester, categories, targetGrade } = req.body;

    const grade = new Grade({
      student: req.userId,
      courseName,
      courseCode,
      semester,
      categories,
      targetGrade,
    });

    await grade.save();
    res.status(201).json(grade);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getGrades = async (req, res) => {
  try {
    const { semester } = req.query;
    const query = { student: req.userId };
    if (semester) query.semester = semester;

    const grades = await Grade.find(query).sort({ createdAt: -1 });
    res.json(grades);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateGrade = async (req, res) => {
  try {
    const grade = await Grade.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    res.json(grade);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getGradeSummary = async (req, res) => {
  try {
    const grades = await Grade.find({
      student: req.userId,
      semester: req.params.semester,
    });

    const semesterGPA = grades.length > 0
      ? (grades.reduce((sum, g) => sum + (g.weightedAverage || 0), 0) / grades.length).toFixed(2)
      : 0;

    res.json({
      semesterGPA,
      courseCount: grades.length,
      courses: grades,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### Bước 4: Tạo Community Routes & Controller

Tạo file `backend/src/routes/communityRoutes.js`:
```javascript
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getPosts,
  createPost,
  likePost,
  addComment,
} from '../controllers/communityController.js';

const router = express.Router();

router.get('/', getPosts);
router.post('/', protect, createPost);
router.post('/:id/like', protect, likePost);
router.post('/:id/comment', protect, addComment);

export default router;
```

Tạo file `backend/src/controllers/communityController.js`:
```javascript
import Post from '../models/Post.js';

export const createPost = async (req, res) => {
  try {
    const { title, content, category, communityType, university } = req.body;

    const post = new Post({
      author: req.userId,
      title,
      content,
      category,
      communityType,
      university,
    });

    await post.save();
    await post.populate('author', 'firstName lastName profilePhoto');
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPosts = async (req, res) => {
  try {
    const { category, communityType } = req.query;
    const query = { isDeleted: false };
    if (category) query.category = category;
    if (communityType) query.communityType = communityType;

    const posts = await Post.find(query)
      .populate('author', 'firstName lastName profilePhoto university')
      .sort({ isPinned: -1, createdAt: -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    post.toggleLike(req.userId);
    await post.save();
    res.json({ likeCount: post.likeCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.id);
    const comment = post.addComment(req.userId, text);
    await post.save();
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### Bước 5: Tạo Marketplace Routes & Controller

Tạo file `backend/src/routes/marketplaceRoutes.js`:
```javascript
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getListings,
  createListing,
  updateListing,
  deleteListing,
} from '../controllers/marketplaceController.js';

const router = express.Router();

router.get('/', getListings);
router.post('/', protect, createListing);
router.put('/:id', protect, updateListing);
router.delete('/:id', protect, deleteListing);

export default router;
```

Tạo file `backend/src/controllers/marketplaceController.js`:
```javascript
import Listing from '../models/Listing.js';

export const createListing = async (req, res) => {
  try {
    const { title, author, isbn, condition, price, exchangeType, university } = req.body;

    const listing = new Listing({
      seller: req.userId,
      title,
      author,
      isbn,
      condition,
      price,
      exchangeType,
      university,
    });

    await listing.save();
    await listing.populate('seller', 'firstName lastName profilePhoto averageRating');
    res.status(201).json(listing);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getListings = async (req, res) => {
  try {
    const { university, condition, status = 'available' } = req.query;
    const query = { status };
    if (university) query.university = university;
    if (condition) query.condition = condition;

    const listings = await Listing.find(query)
      .populate('seller', 'firstName lastName profilePhoto averageRating')
      .sort({ createdAt: -1 });

    res.json(listings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateListing = async (req, res) => {
  try {
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    res.json(listing);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteListing = async (req, res) => {
  try {
    await Listing.findByIdAndDelete(req.params.id);
    res.json({ message: 'Listing deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### Bước 6: Update server.js để import routes

Sửa file `backend/src/server.js`:
```javascript
// Thêm vào section routes:
import gradeRoutes from './routes/gradeRoutes.js';
import communityRoutes from './routes/communityRoutes.js';
import marketplaceRoutes from './routes/marketplaceRoutes.js';

// ...trong app setup:
app.use('/api/grades', gradeRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/marketplace', marketplaceRoutes);
```

---

## 🔗 Kết Nối Mobile với Backend

### Bước 1: Tạo API Service

Tạo file `mobile-app/src/services/api.js`:
```javascript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Thêm token vào mỗi request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      AsyncStorage.removeItem('authToken');
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Bước 2: Tạo Auth Service

Tạo file `mobile-app/src/services/authService.js`:
```javascript
import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const authService = {
  register: async (data) => {
    const response = await api.post('/auth/register', data);
    if (response.data.token) {
      await AsyncStorage.setItem('authToken', response.data.token);
    }
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      await AsyncStorage.setItem('authToken', response.data.token);
    }
    return response.data;
  },

  logout: async () => {
    await AsyncStorage.removeItem('authToken');
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};
```

### Bước 3: Tạo Grade Service

Tạo file `mobile-app/src/services/gradeService.js`:
```javascript
import api from './api';

export const gradeService = {
  getGrades: async (semester) => {
    const response = await api.get('/grades', { params: { semester } });
    return response.data;
  },

  addGrade: async (gradeData) => {
    const response = await api.post('/grades', gradeData);
    return response.data;
  },

  updateGrade: async (id, gradeData) => {
    const response = await api.put(`/grades/${id}`, gradeData);
    return response.data;
  },

  getSummary: async (semester) => {
    const response = await api.get(`/grades/summary/${semester}`);
    return response.data;
  },
};
```

### Bước 4: Tạo Community Service

Tạo file `mobile-app/src/services/communityService.js`:
```javascript
import api from './api';

export const communityService = {
  getPosts: async (query) => {
    const response = await api.get('/community', { params: query });
    return response.data;
  },

  createPost: async (postData) => {
    const response = await api.post('/community', postData);
    return response.data;
  },

  likePost: async (postId) => {
    const response = await api.post(`/community/${postId}/like`);
    return response.data;
  },

  addComment: async (postId, text) => {
    const response = await api.post(`/community/${postId}/comment`, { text });
    return response.data;
  },
};
```

### Bước 5: Tạo Marketplace Service

Tạo file `mobile-app/src/services/marketplaceService.js`:
```javascript
import api from './api';

export const marketplaceService = {
  getListings: async (query) => {
    const response = await api.get('/marketplace', { params: query });
    return response.data;
  },

  createListing: async (listingData) => {
    const response = await api.post('/marketplace', listingData);
    return response.data;
  },

  updateListing: async (id, listingData) => {
    const response = await api.put(`/marketplace/${id}`, listingData);
    return response.data;
  },

  deleteListing: async (id) => {
    const response = await api.delete(`/marketplace/${id}`);
    return response.data;
  },
};
```

### Bước 6: Connect Redux với Services

Sửa file `mobile-app/src/screens/auth/LoginScreen.js`:
```javascript
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import { loginSuccess, loginFailure, setLoading } from '../../store/slices/authSlice';
import { authService } from '../../services/authService';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    dispatch(setLoading(true));
    try {
      const response = await authService.login(email, password);
      dispatch(loginSuccess({
        user: response.user,
        token: response.token,
      }));
    } catch (error) {
      dispatch(loginFailure(error.message));
      Alert.alert('Login Failed', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cantea</Text>
      <Text style={styles.subtitle}>Đăng Nhập</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        placeholderTextColor="#999"
      />

      <TextInput
        style={styles.input}
        placeholder="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor="#999"
      />

      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginButtonText}>Đăng Nhập</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.registerText}>
          Chưa có tài khoản? <Text style={styles.registerLink}>Đăng Ký</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#B91D3A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#B91D3A',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
  registerLink: {
    color: '#B91D3A',
    fontWeight: 'bold',
  },
});
```

Sửa `mobile-app/src/screens/app/GradesScreen.js`:
```javascript
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { setGradeLoading, setGrades, setGradeSummary } from '../../store/slices/gradeSlice';
import { gradeService } from '../../services/gradeService';

export default function GradesScreen() {
  const { grades, semesterGPA, loading, selectedSemester } = useSelector((state) => state.grades);
  const dispatch = useDispatch();

  useEffect(() => {
    fetchGrades();
  }, [selectedSemester]);

  const fetchGrades = async () => {
    try {
      dispatch(setGradeLoading(true));
      const data = await gradeService.getGrades(selectedSemester);
      dispatch(setGrades(data));

      const summary = await gradeService.getSummary(selectedSemester);
      dispatch(setGradeSummary(summary));
    } catch (error) {
      console.error('Error fetching grades:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#B91D3A" />
      </View>
    );
  }

  const getGradeColor = (score) => {
    if (score >= 8.5) return '#4CAF50';
    if (score >= 7.0) return '#2196F3';
    if (score >= 5.5) return '#FF9800';
    return '#F44336';
  };

  return (
    <View style={styles.container}>
      {semesterGPA && (
        <View style={styles.gpaCard}>
          <Text style={styles.gpaLabel}>GPA Kỳ Này</Text>
          <Text style={styles.gpaValue}>{semesterGPA.toFixed(2)}</Text>
        </View>
      )}
      <FlatList
        data={grades}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.gradeCard}>
            <Text style={styles.courseName}>{item.courseName}</Text>
            <Text style={[styles.grade, { color: getGradeColor(item.weightedAverage) }]}>
              {item.weightedAverage?.toFixed(1) || 'N/A'}
            </Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  gpaCard: { backgroundColor: '#B91D3A', padding: 20, alignItems: 'center' },
  gpaLabel: { fontSize: 14, color: '#FFF', opacity: 0.8 },
  gpaValue: { fontSize: 40, fontWeight: 'bold', color: '#FFF' },
  listContent: { paddingHorizontal: 15, paddingVertical: 15 },
  gradeCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FFF', padding: 15, marginBottom: 10, borderRadius: 8 },
  courseName: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  grade: { fontSize: 18, fontWeight: 'bold' },
});
```

---

## 🧪 Testing & Debug

### Test Backend với Postman

1. **Import Postman Collection**
   - Mở Postman
   - Tạo folder "Cantea"

2. **Test Register**
   ```
   POST http://localhost:5000/api/auth/register
   Body (JSON):
   {
     "email": "student@student.rmit.edu.vn",
     "password": "TestPass123",
     "firstName": "John",
     "lastName": "Doe",
     "universityEmail": "student@student.rmit.edu.vn"
   }
   ```

3. **Test Login**
   ```
   POST http://localhost:5000/api/auth/login
   Body:
   {
     "email": "student@student.rmit.edu.vn",
     "password": "TestPass123"
   }
   
   Response sẽ có token - copy token này
   ```

4. **Test Get My Profile**
   ```
   GET http://localhost:5000/api/auth/me
   Headers:
   Authorization: Bearer <your-token-here>
   ```

5. **Test Add Grade**
   ```
   POST http://localhost:5000/api/grades
   Headers:
   Authorization: Bearer <your-token>
   Body:
   {
     "courseName": "Mathematics",
     "courseCode": "MATH101",
     "semester": "Fall 2024",
     "categories": [
       {
         "name": "Quiz",
         "weight": 20,
         "score": 8.5
       },
       {
         "name": "Assignment",
         "weight": 30,
         "score": 9.0
       },
       {
         "name": "Final",
         "weight": 50,
         "score": 7.5
       }
     ]
   }
   ```

### Debug Mobile App

```javascript
// Thêm vào service để log requests:
api.interceptors.request.use((config) => {
  console.log('API Request:', config.method.toUpperCase(), config.url);
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.data);
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data);
    return Promise.reject(error);
  }
);
```

---

## 🚀 Deployment

### Deploy Backend (Heroku)

```bash
# 1. Login to Heroku
heroku login

# 2. Create app
heroku create cantea-backend

# 3. Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your-atlas-uri
heroku config:set JWT_SECRET=your-secret

# 4. Deploy
git push heroku main

# 5. View logs
heroku logs --tail
```

### Deploy Mobile App (Expo)

```bash
# 1. Build for iOS
eas build --platform ios

# 2. Build for Android
eas build --platform android

# 3. Submit to App Store / Google Play
eas submit --platform ios
eas submit --platform android
```

---

## ✅ Checklist Hoàn Thành

- [ ] Backend chạy thành công trên localhost:5000
- [ ] MongoDB kết nối thành công
- [ ] Auth routes test ok (register, login)
- [ ] Grade routes test ok
- [ ] Community routes test ok
- [ ] Marketplace routes test ok
- [ ] Mobile app chạy trên simulator
- [ ] Mobile app kết nối API thành công
- [ ] Login/Register hoạt động
- [ ] Hiển thị grades
- [ ] Hiển thị community posts
- [ ] Tạo listings
- [ ] All UI screens render correctly
- [ ] No console errors

---

## 📞 Troubleshooting

### Backend không kết nối MongoDB
```bash
# Check MongoDB running
mongosh

# Hoặc check Atlas connection string
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/cantea
```

### Port 5000 đã được sử dụng
```bash
# Find process using port
lsof -i :5000

# Kill process
kill -9 <PID>
```

### Mobile app không kết nối backend
```bash
# Check API_BASE_URL trong api.js
# Nếu dùng Android Emulator: http://10.0.2.2:5000
# Nếu dùng iOS Simulator: http://localhost:5000
# Nếu dùng real device: http://your-ip:5000
```

### React Native compilation error
```bash
# Clear cache
npm start -- --clear
```

---

Bây giờ bạn đã có **app hoàn chỉnh**! 🎉
