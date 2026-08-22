import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    // Authentication
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /.+\@.+\..+/,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    password: {
      type: String,
      select: false, // Don't return password by default
    },
    
    // Profile Information
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    profilePhoto: {
      type: String, // URL to photo
      default: null,
    },
    bio: {
      type: String,
      maxlength: 500,
      default: '',
    },
    
    // University Information
    university: {
      type: String,
      required: true, // Auto-detected from email domain
      enum: ['RMIT Vietnam', 'Saigon University', 'UEH', 'Ton Duc Thang University', 'HCMUNRE', 'Other'],
    },
    universityEmail: {
      type: String,
      required: true,
      unique: true,
    },
    major: {
      type: String,
      default: '',
    },
    year: {
      type: Number, // 1, 2, 3, 4
      min: 1,
      max: 6,
    },
    studentId: {
      type: String,
      unique: true,
      sparse: true,
    },
    
    // Privacy Settings
    privacy: {
      profileVisibility: {
        type: String,
        enum: ['public', 'university-only', 'friends-only', 'private'],
        default: 'university-only',
      },
      showGrades: {
        type: Boolean,
        default: false, // Don't show grades publicly by default
      },
      showSchedule: {
        type: Boolean,
        default: false,
      },
      allowMessages: {
        type: Boolean,
        default: true,
      },
    },
    
    // Social
    friends: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    blockedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    
    // Account Status
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    
    // Roles
    roles: {
      type: [String],
      enum: ['student', 'moderator', 'admin'],
      default: ['student'],
    },
    
    // Reputation
    trustScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    exchangesCompleted: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    
    // Settings
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      classReminders: { type: Boolean, default: true },
    },
    
    lastLogin: Date,
    lastActive: Date,
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to get public profile (exclude sensitive data)
userSchema.methods.getPublicProfile = function () {
  const profile = this.toObject();
  delete profile.password;
  delete profile.googleId;
  delete profile.universityEmail;
  delete profile.blockedUsers;
  return profile;
};

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ universityEmail: 1 });
userSchema.index({ university: 1 });
userSchema.index({ createdAt: -1 });

const User = mongoose.model('User', userSchema);

export default User;
