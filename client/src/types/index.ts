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

// Meeting Types
export interface MeetingResponse {
    id: number;
    meetingId: string;
    title: string;
    createdBy: number;
    createdByName: string;
    status: 'ACTIVE' | 'ENDED';
    createdAt: string;
    participantCount: number;
}

export interface CreateMeetingRequest {
    title?: string;
}

export interface MeetingParticipantResponse {
    userId: number;
    userName: string;
    userUsername: string;
    joinedAt: string;
    leftAt: string | null;
}