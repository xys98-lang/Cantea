import mongoose from 'mongoose';

// Review Schema (nested in Listing for feedback)
const reviewSchema = new mongoose.Schema(
  {
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    comment: {
      type: String,
      maxlength: 500,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Main Listing Schema
const listingSchema = new mongoose.Schema(
  {
    // Seller
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    // Book Information
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    author: {
      type: String,
      required: true,
      trim: true,
    },
    isbn: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
      maxlength: 1000,
    },
    
    // Course Info (optional)
    courseCode: {
      type: String,
      default: '',
    },
    courseName: {
      type: String,
      default: '',
    },
    faculty: {
      type: String,
      default: '',
    },
    
    // Condition
    condition: {
      type: String,
      enum: ['new', 'like-new', 'good', 'fair', 'poor'],
      required: true,
    },
    
    // Pricing & Exchange
    price: {
      type: Number,
      default: null, // null if only trading
    },
    currency: {
      type: String,
      default: 'VND',
    },
    
    exchangeType: {
      type: String,
      enum: ['sell', 'trade', 'both'],
      default: 'both',
    },
    
    wantedBooks: [{
      title: String,
      author: String,
      isbn: String,
    }],
    
    // Media
    images: [{
      type: String, // URLs
    }],
    
    // Location
    university: {
      type: String,
      required: true,
    },
    meetingLocation: {
      type: String, // e.g., "RMIT Library", "Student Cafe"
      default: '',
    },
    
    // Status
    status: {
      type: String,
      enum: ['available', 'pending', 'sold', 'exchanged', 'removed'],
      default: 'available',
    },
    
    // Sold/Exchanged Info
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    soldAt: Date,
    exchangedWith: {
      listingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Listing',
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },
    
    // Engagement
    views: {
      type: Number,
      default: 0,
    },
    favorites: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    favoriteCount: {
      type: Number,
      default: 0,
    },
    
    // Reviews & Rating
    reviews: [reviewSchema],
    averageRating: {
      type: Number,
      default: null,
      min: 1,
      max: 5,
    },
    
    // Moderation
    isFlagged: {
      type: Boolean,
      default: false,
    },
    flagReason: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    
    // Activity
    lastActive: Date,
  },
  {
    timestamps: true,
  }
);

// Method to add review
listingSchema.methods.addReview = function (reviewerId, rating, comment) {
  const review = {
    reviewer: reviewerId,
    rating,
    comment,
  };
  this.reviews.push(review);
  
  // Recalculate average rating
  if (this.reviews.length > 0) {
    const avgRating = this.reviews.reduce((sum, r) => sum + r.rating, 0) / this.reviews.length;
    this.averageRating = Math.round(avgRating * 10) / 10;
  }
  
  return review;
};

// Method to toggle favorite
listingSchema.methods.toggleFavorite = function (userId) {
  const index = this.favorites.indexOf(userId);
  if (index > -1) {
    this.favorites.splice(index, 1);
    this.favoriteCount--;
  } else {
    this.favorites.push(userId);
    this.favoriteCount++;
  }
};

// Method to mark as sold
listingSchema.methods.markAsSold = function (buyerId) {
  this.status = 'sold';
  this.buyer = buyerId;
  this.soldAt = new Date();
};

// Indexes for faster queries
listingSchema.index({ seller: 1, status: 1 });
listingSchema.index({ university: 1, status: 1 });
listingSchema.index({ title: 'text', author: 'text', description: 'text' });
listingSchema.index({ status: 1, createdAt: -1 });
listingSchema.index({ favoriteCount: -1 });
listingSchema.index({ averageRating: -1 });
listingSchema.index({ courseCode: 1 });

const Listing = mongoose.model('Listing', listingSchema);

export default Listing;
