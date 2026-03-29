export type UserRole = 'personal' | 'student';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  personalId?: string;
  photoUrl?: string;
  phone?: string;
  goal?: string;
  createdAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  description?: string;
  videoUrl?: string;
  gifUrl?: string;
}

export interface WorkoutExercise {
  exerciseId: string;
  name: string;
  sets: number;
  reps: string;
  rest: string;
  load: string;
  notes?: string;
  muscleGroup?: string;
  gifUrl?: string;
}

export interface Workout {
  id: string;
  studentId: string;
  personalId: string;
  name: string;
  isPremium?: boolean;
  exercises: WorkoutExercise[];
  createdAt: string;
}

export interface Plan {
  id: string;
  personalId: string;
  name: string;
  price: number;
  durationMonths: number;
  durationDays?: number;
  features?: string[];
  isFeatured?: boolean;
  tagline?: string;
  createdAt?: string;
}

export interface Subscription {
  id: string;
  studentId: string;
  planId: string;
  status: 'active' | 'expired' | 'pending';
  startDate: string;
  endDate: string;
  createdAt?: string;
  plan?: Plan;
}

export interface Evolution {
  id: string;
  studentId: string;
  date: string;
  weight: number;
  measurements?: {
    chest?: number;
    waist?: number;
    biceps?: number;
    thigh?: number;
  };
  photos?: string[];
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
}
