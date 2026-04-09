export type SubscriptionTier = "starter" | "pro" | "elite" | null;

export interface User {
  id: string;
  name: string;
  email: string;
  role: "client" | "admin" | "new";
  subscription_tier?: SubscriptionTier;
  subscription_status?: "active" | "canceled" | "expired" | "trial";
  subscription_expires_at?: string;
  client_limit?: number;
}

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  price: number;
  clientLimit: number;
  features: string[];
  productId: string; // App Store/Google Play product ID
}

export interface Workout {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  date: string; // ISO date string
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export interface UserContextType {
  users: User[];
  addUser: (user: User) => void;
  removeUser: (userId: string) => void;
}
