/**
 * User and Authentication Models
 */

export interface User {
    avatar: null;
    _id?: string;
    id?: string;
    email: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    phoneNumber?: string;
    role?: string;
    isAdmin?: boolean;
    isVerified?: boolean;
    onboardingComplete?: boolean;
    userType?: string;
    profilePicture?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    token?: string;
    user?: User;
    data?: {
        token?: string;
        accessToken?: string;
        refreshToken?: string;
        user?: User;
        requiresOtp?: boolean;
        email?: string;
    };
    requiresOtp?: boolean;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
}

export interface OTPVerifyRequest {
    email: string;
    otp: string;
}

export interface PasswordResetRequest {
    email: string;
}

export interface PasswordResetConfirm {
    email: string;
    token: string;
    newPassword: string;
}

export interface ResendOTPRequest {
    email: string;
}

export interface SocialAuthRequest {
    provider: 'google' | 'apple';
    token: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    profilePicture?: string;
}