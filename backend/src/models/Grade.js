import mongoose from 'mongoose';

// Grade Category Schema (Quiz, Assignment, Midterm, Final, etc.)
const gradeCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true, // e.g., "Quiz", "Assignment", "Midterm", "Final", "Bonus"
  },
  weight: {
    type: Number,
    required: true,
    min: 0,
    max: 100, // Percentage
  },
  score: {
    type: Number,
    min: 0,
    max: 10,
    default: null,
  },
  maxScore: {
    type: Number,
    default: 10,
  },
  enteredAt: {
    type: Date,
    default: Date.now,
  },
});

// Main Grade Schema
const gradeSchema = new mongoose.Schema(
  {
    // Student
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    // Course Information
    courseCode: {
      type: String,
      required: true,
    },
    courseName: {
      type: String,
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    
    // Semester/Term
    semester: {
      type: String,
      required: true, // e.g., "Fall 2024", "Spring 2025"
    },
    academicYear: {
      type: String,
      required: true,
    },
    
    // Faculty
    faculty: {
      type: String,
      default: 'Other',
    },
    
    // Instructor
    instructor: {
      type: String,
      default: '',
    },
    
    // Grade Categories (flexible structure)
    categories: [gradeCategorySchema],
    
    // Calculated Grades
    weightedAverage: {
      type: Number,
      min: 0,
      max: 10,
      default: null,
    },
    letterGrade: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'F', 'P', 'F', null],
      default: null,
    },
    
    // Target/Goal
    targetGrade: {
      type: Number,
      min: 0,
      max: 10,
      default: null,
    },
    isPassed: {
      type: Boolean,
      default: null,
    },
    
    // Notes
    notes: {
      type: String,
      default: '',
    },
    
    // Credits
    credits: {
      type: Number,
      default: 3,
    },
    
    // Status
    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate weighted average before saving
gradeSchema.pre('save', function () {
  if (this.categories && this.categories.length > 0) {
    let totalWeight = 0;
    let weightedSum = 0;
    
    this.categories.forEach((category) => {
      if (category.score !== null && category.score !== undefined) {
        weightedSum += (category.score * category.weight) / 100;
        totalWeight += category.weight;
      }
    });
    
    if (totalWeight > 0) {
      this.weightedAverage = parseFloat((weightedSum / (totalWeight / 100)).toFixed(2));
      
      // Calculate letter grade
      if (this.weightedAverage >= 8.5) this.letterGrade = 'A';
      else if (this.weightedAverage >= 7.0) this.letterGrade = 'B';
      else if (this.weightedAverage >= 5.5) this.letterGrade = 'C';
      else if (this.weightedAverage >= 4.0) this.letterGrade = 'D';
      else this.letterGrade = 'F';
      
      // Check if passed (typically need >= 4.0)
      this.isPassed = this.weightedAverage >= 4.0;
    }
  }
});

// Method to add/update a grade category
gradeSchema.methods.addCategory = function (categoryData) {
  const existingIndex = this.categories.findIndex(
    (cat) => cat.name === categoryData.name
  );
  
  if (existingIndex !== -1) {
    this.categories[existingIndex] = categoryData;
  } else {
    this.categories.push(categoryData);
  }
};

// Method to get progress towards target
gradeSchema.methods.getProgressToTarget = function () {
  if (!this.targetGrade || !this.weightedAverage) return null;
  return {
    current: this.weightedAverage,
    target: this.targetGrade,
    remaining: Math.max(0, this.targetGrade - this.weightedAverage),
    percentageToTarget: (this.weightedAverage / this.targetGrade) * 100,
  };
};

// Indexes for faster queries
gradeSchema.index({ student: 1, semester: 1 });
gradeSchema.index({ student: 1, academicYear: 1 });
gradeSchema.index({ courseCode: 1 });
gradeSchema.index({ createdAt: -1 });

const Grade = mongoose.model('Grade', gradeSchema);

export default Grade;
