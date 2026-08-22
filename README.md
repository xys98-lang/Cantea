# Cantea - Student Community Platform

A comprehensive mobile application for university students in Ho Chi Minh City, featuring schedule management, academic performance tracking, community engagement, and a book exchange marketplace.

## 📱 Project Structure

```
cantea-project/
├── backend/                    # Node.js + Express + MongoDB API
│   ├── src/
│   │   ├── config/            # Database & external service configs
│   │   ├── controllers/        # Request handlers
│   │   ├── models/            # MongoDB schemas
│   │   │   ├── User.js
│   │   │   ├── Course.js
│   │   │   ├── Grade.js
│   │   │   ├── Post.js
│   │   │   └── Listing.js
│   │   ├── routes/            # API endpoints
│   │   ├── middleware/        # Auth, error handling
│   │   ├── services/          # Business logic
│   │   └── utils/             # Helpers, logger
│   ├── uploads/               # User uploads
│   └── logs/                  # Application logs
│
├── mobile-app/                # React Native mobile app
│   ├── src/
│   │   ├── screens/           # Screen components
│   │   │   ├── auth/          # Login, Register, Profile Setup
│   │   │   └── app/           # Main app screens
│   │   ├── navigation/        # Navigation setup
│   │   ├── components/        # Reusable UI components
│   │   ├── services/          # API calls
│   │   ├── store/             # Redux state management
│   │   └── utils/             # Helper functions
│   └── assets/                # Images, fonts
│
└── docs/                      # Documentation
```

## ✨ Features

### 1. **Schedule Management (Lịch Học)**
- Import/manually add class schedule
- Week/month view toggle
- Reminders before class
- Filter by faculty/department
- Color-coded courses

### 2. **Academic Performance Tracker (Điểm Thi)**
- Track quizzes, assignments, midterms, finals
- Auto-calculate weighted GPA
- Set target grades
- View grade trends
- Export grade report
- Share with classmates

### 3. **Community Features**
- **Global Feed**: Posts from all HCMC universities
- **University Communities**: School-specific channels
- **Faculty Sub-channels**: By department
- Posts, comments, upvote system
- Category-based organization

### 4. **Book Exchange Marketplace (Chợ Trao Đổi Sách)**
- Create listings (title, author, condition, photos)
- Search books by course code
- Direct messaging with sellers
- Seller ratings & trust scores
- No payment processing (peer-to-peer cash)

### 5. **User Authentication**
- Gmail OAuth login
- Automatic university detection
- Profile customization
- Privacy controls

## 🚀 Getting Started

### Backend Setup

#### Prerequisites
- Node.js 16+ and npm
- MongoDB local or Atlas cluster
- Google OAuth credentials

#### Installation

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Update .env with your credentials
MONGODB_URI=mongodb://localhost:27017/cantea
JWT_SECRET=your-super-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret

# Start development server
npm run dev

# Server runs on http://localhost:5000
```

#### Running Tests
```bash
npm test
```

### Mobile App Setup

#### Prerequisites
- Node.js 16+
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator

#### Installation

```bash
cd mobile-app

# Install dependencies
npm install

# Start development server
npm start

# For iOS
npm run ios

# For Android
npm run android

# For Web
npm run web
```

## 🏗️ Architecture

### Backend Architecture

```
Request → Middleware (Auth, Validation) 
        → Route Handler 
        → Controller 
        → Service (Business Logic) 
        → MongoDB Model 
        → Response
```

### Mobile Architecture

```
Redux Store (Global State)
  ├── auth (user, tokens, auth status)
  ├── schedule (courses, reminders)
  ├── grades (performance, GPA)
  ├── community (posts, engagement)
  └── marketplace (listings, favorites)

Navigation
  ├── Auth Stack (Login, Register, Profile Setup)
  └── App Stack (5 Tab Navigation)
       ├── Schedule
       ├── Grades
       ├── Community
       ├── Marketplace
       └── Profile
```

## 📚 API Endpoints

### Authentication
```
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/google/callback
POST   /api/auth/logout
GET    /api/auth/refresh-token
```

### Schedule
```
GET    /api/schedule/courses
POST   /api/schedule/courses
PUT    /api/schedule/courses/:id
DELETE /api/schedule/courses/:id
```

### Grades
```
GET    /api/grades/semester/:semesterId
POST   /api/grades
PUT    /api/grades/:id
GET    /api/grades/summary
```

### Community
```
GET    /api/community/posts
POST   /api/community/posts
PUT    /api/community/posts/:id
DELETE /api/community/posts/:id
POST   /api/community/posts/:id/like
POST   /api/community/posts/:id/comment
```

### Marketplace
```
GET    /api/marketplace/listings
POST   /api/marketplace/listings
PUT    /api/marketplace/listings/:id
DELETE /api/marketplace/listings/:id
POST   /api/marketplace/listings/:id/favorite
POST   /api/marketplace/listings/:id/review
```

### Users
```
GET    /api/users/:id
PUT    /api/users/:id
GET    /api/users/:id/profile
POST   /api/users/:id/profile-photo
```

## 🗄️ Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String,
  googleId: String,
  firstName: String,
  lastName: String,
  university: String,
  universityEmail: String,
  major: String,
  year: Number,
  privacy: {
    profileVisibility: String,
    showGrades: Boolean,
    showSchedule: Boolean,
  },
  trustScore: Number,
  exchangesCompleted: Number,
  averageRating: Number,
  createdAt: Date,
  updatedAt: Date,
}
```

### Grades Collection
```javascript
{
  _id: ObjectId,
  student: ObjectId (ref: User),
  courseCode: String,
  courseName: String,
  semester: String,
  categories: [
    {
      name: String,        // "Quiz", "Assignment", "Midterm", "Final"
      weight: Number,      // 0-100
      score: Number,       // 0-10
    }
  ],
  weightedAverage: Number,
  letterGrade: String,
  targetGrade: Number,
  isPassed: Boolean,
  createdAt: Date,
}
```

### Posts Collection
```javascript
{
  _id: ObjectId,
  author: ObjectId (ref: User),
  title: String,
  content: String,
  images: [String],
  communityType: String,  // "global", "university", "faculty"
  category: String,       // "Academics", "Student Life", etc.
  university: String,
  likes: [ObjectId],
  comments: [
    {
      author: ObjectId,
      text: String,
      likes: [ObjectId],
    }
  ],
  createdAt: Date,
}
```

### Listings Collection
```javascript
{
  _id: ObjectId,
  seller: ObjectId (ref: User),
  title: String,
  author: String,
  isbn: String,
  condition: String,  // "new", "like-new", "good", "fair", "poor"
  price: Number,
  exchangeType: String,  // "sell", "trade", "both"
  images: [String],
  university: String,
  status: String,     // "available", "sold", "exchanged"
  buyer: ObjectId,
  reviews: [
    {
      reviewer: ObjectId,
      rating: Number,
      comment: String,
    }
  ],
  createdAt: Date,
}
```

## 🔐 Security

- **JWT Authentication**: Tokens with 7-day expiry
- **Password Hashing**: bcryptjs (10 salt rounds)
- **CORS**: Restricted to whitelisted origins
- **Rate Limiting**: 100 requests per 15 minutes
- **Input Validation**: Joi schema validation
- **Data Privacy**: User data encrypted, privacy controls

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

Tests cover:
- Authentication flows
- CRUD operations
- Business logic
- Error handling

### Mobile Testing
```bash
cd mobile-app
npm test
```

## 📦 Deployment

### Backend (Heroku/AWS/Railway)

```bash
# Create Procfile
echo "web: npm start" > Procfile

# Deploy
git push heroku main
```

### Mobile (React Native)

**iOS:**
```bash
cd mobile-app
eas build --platform ios
eas submit --platform ios
```

**Android:**
```bash
cd mobile-app
eas build --platform android
eas submit --platform android
```

## 🤝 Contributing

1. Clone the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📋 Development Roadmap

### Phase 1 (Weeks 1-4): Foundation
- Backend infrastructure & auth
- User profiles & university detection
- Database setup

### Phase 2 (Weeks 5-8): Core Features
- Schedule management
- Community feed
- University communities
- Academic tracker

### Phase 3 (Weeks 9-12): Marketplace & Launch
- Book exchange marketplace
- Seller ratings & trust
- Beta launch (500-1000 users)
- Bug fixes & optimization

### Phase 2 (Future): Expansion
- Hanoi & Da Nang expansion
- Mobile payment integration
- UniDeals partnerships
- Advanced analytics

## 📊 Success Metrics

- **5,000+ DAU** within 3 months
- **80%+** 7-day retention
- **50%+** of users tracking grades
- **300+ listings** in marketplace
- **4.3/5.0** average seller rating

## 🐛 Known Issues

None currently. Please report bugs via GitHub Issues.

## 📞 Support

- Email: support@cantea.vn
- Discord: [Cantea Community]
- Documentation: docs/

## 📄 License

MIT License - see LICENSE file for details

## 👨‍💻 Authors

- **HyperX-HCMC** - Initial concept & development

---

**Built with ❤️ for students in Ho Chi Minh City**
