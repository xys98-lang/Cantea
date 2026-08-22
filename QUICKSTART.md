# 🚀 Cantea - Quick Start Guide

Get Cantea running in minutes!

## Option 1: Docker (Recommended - Easiest)

### Prerequisites
- Docker & Docker Compose installed

### Steps

```bash
# 1. Clone the project (or navigate to it)
cd cantea-project

# 2. Create .env file for backend
cp backend/.env.example backend/.env

# Update these values in backend/.env:
# GOOGLE_CLIENT_ID=your-google-id
# GOOGLE_CLIENT_SECRET=your-google-secret

# 3. Start all services with Docker
docker-compose up -d

# Backend will be available at http://localhost:5000
# MongoDB will be available at mongodb://admin:password@localhost:27017

# 4. Verify services are running
docker-compose ps

# 5. View logs
docker-compose logs -f backend
```

### Testing the Backend

```bash
# Health check
curl http://localhost:5000/api/health

# Should return:
# {"status":"OK","timestamp":"2024-08-21T..."}
```

## Option 2: Manual Setup

### Backend

```bash
# 1. Navigate to backend
cd backend

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your credentials

# 4. Make sure MongoDB is running
# Option A: Local MongoDB
mongod

# Option B: MongoDB Atlas (update connection string in .env)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cantea

# 5. Start development server
npm run dev

# Backend runs on http://localhost:5000
```

### Mobile App

```bash
# 1. Navigate to mobile-app
cd mobile-app

# 2. Install dependencies
npm install

# 3. Start Expo development server
npm start

# 4. Run on simulator/emulator
# iOS:  Press 'i'
# Android: Press 'a'
# Web: Press 'w'

# 5. Open in Expo Go app (mobile scanning)
# Scan QR code shown in terminal
```

## 📱 Login to Test App

Use these test credentials (create your own):

**Email:** student@student.rmit.edu.vn  
**Password:** TestPassword123

Or use Gmail OAuth (set up your own credentials)

## 🔧 Common Commands

### Backend
```bash
# Development
npm run dev

# Production
npm start

# Run tests
npm test

# View logs
tail -f logs/all.log
```

### Mobile
```bash
# Start dev server
npm start

# iOS simulator
npm run ios

# Android emulator
npm run android

# Web browser
npm run web

# Lint code
npm run lint

# Format code
npm run format
```

## 🛑 Stop Services

### Docker
```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Manual
- Press Ctrl+C in terminals running npm processes
- Stop MongoDB if running locally

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 5000 is in use
lsof -i :5000

# Kill process using port 5000
kill -9 <PID>

# Or use different port
PORT=5001 npm run dev
```

### MongoDB connection error
```bash
# Check MongoDB is running
mongosh

# If not installed:
# macOS: brew install mongodb-community
# Ubuntu: sudo apt-get install mongodb
# Or use MongoDB Atlas cloud
```

### Mobile app won't connect to backend
```bash
# Update API URL in: mobile-app/src/services/api.js
# Make sure backend port is correct (5000)
# Check firewall isn't blocking connections
```

### "Module not found" errors
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 📡 API Testing

### Using Postman/Insomnia

1. **GET** Health Check
   ```
   GET http://localhost:5000/api/health
   ```

2. **POST** Register User
   ```
   POST http://localhost:5000/api/auth/register
   Body (JSON):
   {
     "email": "test@student.rmit.edu.vn",
     "password": "TestPass123",
     "firstName": "John",
     "lastName": "Doe"
   }
   ```

3. **POST** Login
   ```
   POST http://localhost:5000/api/auth/login
   Body (JSON):
   {
     "email": "test@student.rmit.edu.vn",
     "password": "TestPass123"
   }
   
   Response:
   {
     "token": "eyJhbGc...",
     "user": {...}
   }
   ```

4. **GET** Get User Profile (requires token)
   ```
   GET http://localhost:5000/api/users/me
   Headers:
   Authorization: Bearer <token-from-login>
   ```

## 📚 Next Steps

1. **Read Documentation**: See `/docs` folder
2. **Explore API**: Test endpoints in Postman
3. **Mobile Development**: Open mobile-app in code editor
4. **Backend Development**: Open backend in code editor
5. **Database**: Connect MongoDB Atlas or local instance

## 🎯 Project Structure

```
cantea-project/
├── backend/           # API Server (Node.js)
├── mobile-app/        # React Native Mobile App
├── docs/              # Documentation
└── docker-compose.yml # Docker setup
```

## 📞 Need Help?

- Check README.md for detailed docs
- Review API endpoint list
- Check console logs for errors
- Verify MongoDB connection string
- Make sure all ports are available

---

**Happy coding! 🎉**
