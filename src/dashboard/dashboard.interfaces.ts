/**
 * Interface for general dashboard statistics
 */
export interface StatsResult {
  totalUsers: number;
  usersByRole: any[];
  tasksByStatus: any[];
  recentPosts: number;
}

/**
 * Interface for attendance-related statistics
 */
export interface AttendanceStatsResult {
  checkInsToday: number;
  pendingLeaves: number;
  overtimeHours: number | string;
}

/**
 * Interface for training-related statistics
 */
export interface TrainingStatsResult {
  activeCourses: number;
  courseRegistrationByStatus: any[];
  averageScore: number | string;
}