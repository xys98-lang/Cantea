import mongoose from 'mongoose';

// Comment Schema (nested in Post)
const commentSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    likeCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Main Post Schema
const postSchema = new mongoose.Schema(
  {
    // Author
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    // Content
    title: {
      type: String,
      required: true,
      maxlength: 200,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 3000,
    },
    
    // Media
    images: [{
      type: String, // URLs
    }],
    
    // Community Type
    communityType: {
      type: String,
      enum: ['global', 'university', 'faculty'],
      default: 'global',
    },
    
    // Category
    category: {
      type: String,
      enum: ['Academics', 'Student Life', 'Events', 'Q&A', 'General', 'Book Exchange', 'Study Group'],
      default: 'General',
    },
    
    // University (for university-specific posts)
    university: {
      type: String,
      default: null,
    },
    
    // Faculty (for faculty-specific posts)
    faculty: {
      type: String,
      default: null,
    },
    
    // Engagement
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    likeCount: {
      type: Number,
      default: 0,
    },
    comments: [commentSchema],
    commentCount: {
      type: Number,
      default: 0,
    },
    shares: {
      type: Number,
      default: 0,
    },
    
    // Moderation
    isApproved: {
      type: Boolean,
      default: true,
    },
    isFlagged: {
      type: Boolean,
      default: false,
    },
    flagReason: {
      type: String,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    
    // Visibility
    isPinned: {
      type: Boolean,
      default: false,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    
    // Stats
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Add comment method
postSchema.methods.addComment = function (userId, commentText) {
  const comment = {
    author: userId,
    text: commentText,
  };
  this.comments.push(comment);
  this.commentCount = this.comments.length;
  return comment;
};

// Like post method
postSchema.methods.toggleLike = function (userId) {
  const index = this.likes.indexOf(userId);
  if (index > -1) {
    this.likes.splice(index, 1);
    this.likeCount--;
  } else {
    this.likes.push(userId);
    this.likeCount++;
  }
};

// Indexes for faster queries
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ communityType: 1, createdAt: -1 });
postSchema.index({ category: 1 });
postSchema.index({ university: 1 });
postSchema.index({ isPinned: 1, createdAt: -1 });
postSchema.index({ likeCount: -1 });
postSchema.index({ isDeleted: 1 });

const Post = mongoose.model('Post', postSchema);

export default Post;
