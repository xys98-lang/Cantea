import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  grades: [],
  gradeSummary: null,
  loading: false,
  error: null,
  selectedSemester: 'Fall 2024',
  semesterGPA: null,
  cumulativeGPA: null,
};

const gradeSlice = createSlice({
  name: 'grades',
  initialState,
  reducers: {
    setGradeLoading: (state, action) => {
      state.loading = action.payload;
    },
    setGrades: (state, action) => {
      state.grades = action.payload;
      state.loading = false;
      state.error = null;
    },
    addGrade: (state, action) => {
      state.grades.push(action.payload);
    },
    updateGrade: (state, action) => {
      const index = state.grades.findIndex(g => g.id === action.payload.id);
      if (index !== -1) {
        state.grades[index] = { ...state.grades[index], ...action.payload };
      }
    },
    setGradeSummary: (state, action) => {
      state.gradeSummary = action.payload;
      state.semesterGPA = action.payload.semesterGPA;
      state.cumulativeGPA = action.payload.cumulativeGPA;
    },
    setGradeError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    setSelectedGradeSemester: (state, action) => {
      state.selectedSemester = action.payload;
    },
  },
});

export const {
  setGradeLoading,
  setGrades,
  addGrade,
  updateGrade,
  setGradeSummary,
  setGradeError,
  setSelectedGradeSemester,
} = gradeSlice.actions;

export default gradeSlice.reducer;
