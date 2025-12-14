// // src/app/models/user.model.ts
// export interface User {
//     id: number;
//     fullName: string;
//     email?: string;
//     phone: string;
//     userType: 'rider' | 'driver' | 'admin';
//     verified: boolean;
//     rating: number;
//     profileImage?: string;
//     createdAt: Date;
// }

// export interface LoginRequest {
//     phone: string;
//     password: string;
// }

// export interface RegisterRequest {
//     fullName: string;
//     phone: string;
//     email?: string;
//     password: string;
//     userType: 'rider' | 'driver';
// }

// export interface AuthResponse {
//     token?: string;
//     user?: User;
//     requiresOtp?: boolean;
//     message?: string;
// }
// src/app/models/user.model.ts

// src/app/models/user.model.ts
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
    onboardingComplete?: boolean; // ⬅️ Add this
    profilePicture?: string;
    createdAt?: string;
    updatedAt?: string;
}

// ... rest of your interfaces (LoginRequest, RegisterRequest, etc.)
export interface AuthResponse {
    success: boolean;
    message: string;
    token?: string;
    user?: User;
    data?: {
        token?: string;
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