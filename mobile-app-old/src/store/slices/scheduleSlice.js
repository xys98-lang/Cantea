import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  courses: [],
  schedule: [],
  loading: false,
  error: null,
  selectedSemester: 'Fall 2024',
};

const scheduleSlice = createSlice({
  name: 'schedule',
  initialState,
  reducers: {
    setScheduleLoading: (state, action) => {
      state.loading = action.payload;
    },
    setSchedule: (state, action) => {
      state.schedule = action.payload;
      state.loading = false;
      state.error = null;
    },
    setCourses: (state, action) => {
      state.courses = action.payload;
    },
    addCourse: (state, action) => {
      state.courses.push(action.payload);
    },
    removeCourse: (state, action) => {
      state.courses = state.courses.filter(c => c.id !== action.payload);
    },
    setScheduleError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    setSelectedSemester: (state, action) => {
      state.selectedSemester = action.payload;
    },
  },
});

export const {
  setScheduleLoading,
  setSchedule,
  setCourses,
  addCourse,
  removeCourse,
  setScheduleError,
  setSelectedSemester,
} = scheduleSlice.actions;

export default scheduleSlice.reducer;
