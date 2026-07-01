export interface User {
    id: number;
    name: string;
    username: string;
    email: string;
    profilePicture?: string | null;
}

export interface PublicUser {
    id: number;
    name: string;
    username: string;
    profilePicture?: string | null;
}

export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
}

export interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, otp: string) => Promise<void>;
    logout: () => Promise<void>;
    sendOtp: (email: string) => Promise<void>;
    fetchCurrentUser: () => Promise<void>;
}