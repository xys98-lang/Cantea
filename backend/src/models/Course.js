import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    // Course Information
    courseCode: {
      type: String,
      required: true,
      trim: true,
    },
    courseName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    credits: {
      type: Number,
      min: 0,
      default: 3,
    },
    
    // Instructor & Location
    instructor: {
      name: {
        type: String,
        default: '',
      },
      email: {
        type: String,
        default: '',
      },
    },
    location: {
      building: {
        type: String,
        default: '',
      },
      room: {
        type: String,
        default: '',
      },
      campus: {
        type: String,
        default: '',
      },
    },
    
    // Faculty/Department
    faculty: {
      type: String,
      enum: ['Engineering', 'Business', 'Arts', 'Science', 'Law', 'Medicine', 'Other'],
      default: 'Other',
    },
    
    // Semester/Term
    semester: {
      type: String,
      enum: ['Fall', 'Spring', 'Summer', 'Year-Round'],
      required: true,
    },
    academicYear: {
      type: String, // e.g., "2024-2025"
      required: true,
    },
    
    // University
    university: {
      type: String,
      required: true,
    },
    
    // Owner (usually instructor or admin)
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const courseSchema_export = courseSchema;
export default courseSchema_export;

// Schedule Schema (Student's timetable)
const scheduleSchema = new mongoose.Schema(
  {
    // Student
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    // Course Reference
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    
    // Schedule Details
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true,
    },
    startTime: {
      type: String, // Format: "HH:MM" (24-hour)
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    
    // Recurring
    isRecurring: {
      type: Boolean,
      default: true,
    },
    recurrenceType: {
      type: String,
      enum: ['weekly', 'bi-weekly', 'once'],
      default: 'weekly',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
    
    // Location
    location: {
      building: String,
      room: String,
      campus: String,
    },
    
    // Notes
    notes: {
      type: String,
      default: '',
    },
    
    // Reminders
    reminderBefore: {
      type: Number, // Minutes before class
      enum: [0, 15, 30, 60],
      default: 15,
    },
    reminderEnabled: {
      type: Boolean,
      default: true,
    },
    
    // Status
    isCancelled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
scheduleSchema.index({ student: 1, startDate: 1 });
scheduleSchema.index({ course: 1 });
scheduleSchema.index({ dayOfWeek: 1 });

const Schedule = mongoose.model('Schedule', scheduleSchema);
const Course = mongoose.model('Course', courseSchema);

export { Course, Schedule };
