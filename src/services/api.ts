import axios from "axios";
import { User, Workout } from "../types";

// Centralized Axios instance so headers/base URL stay consistent.
const API_URL = process.env.EXPO_PUBLIC_API_URL;

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

type WorkoutCreatePayload = Omit<Workout, "id">;
type WorkoutUpdatePayload = Partial<WorkoutCreatePayload>;

const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    return data?.message || error.message || "Unknown error";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
};

const ensureApiUrl = () => {
  if (!API_URL) {
    throw new Error(
      "API URL is not configured. Set EXPO_PUBLIC_API_URL in your env file.",
    );
  }
};

// Workouts
export const getWorkouts = async (): Promise<Workout[]> => {
  ensureApiUrl();

  try {
    const response = await apiClient.get<Workout[]>("/workouts");
    return response.data;
  } catch (error) {
    throw new Error(`Error fetching workouts: ${getErrorMessage(error)}`);
  }
};

export const getWorkoutById = async (id: string): Promise<Workout> => {
  ensureApiUrl();

  try {
    const response = await apiClient.get<Workout>(`/workouts/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(`Error fetching workout: ${getErrorMessage(error)}`);
  }
};

export const createWorkout = async (
  workoutData: WorkoutCreatePayload,
): Promise<Workout> => {
  ensureApiUrl();

  try {
    const response = await apiClient.post<Workout>("/workouts", workoutData);
    return response.data;
  } catch (error) {
    throw new Error(`Error creating workout: ${getErrorMessage(error)}`);
  }
};

export const updateWorkout = async (
  id: string,
  workoutData: WorkoutUpdatePayload,
): Promise<Workout> => {
  ensureApiUrl();

  try {
    const response = await apiClient.put<Workout>(
      `/workouts/${id}`,
      workoutData,
    );
    return response.data;
  } catch (error) {
    throw new Error(`Error updating workout: ${getErrorMessage(error)}`);
  }
};

export const deleteWorkout = async (id: string): Promise<void> => {
  ensureApiUrl();

  try {
    await apiClient.delete(`/workouts/${id}`);
  } catch (error) {
    throw new Error(`Error deleting workout: ${getErrorMessage(error)}`);
  }
};

// Users
export const getUserData = async (userId: string): Promise<User> => {
  ensureApiUrl();

  try {
    const response = await apiClient.get<User>(`/users/${userId}`);
    return response.data;
  } catch (error) {
    throw new Error(`Error fetching user data: ${getErrorMessage(error)}`);
  }
};
