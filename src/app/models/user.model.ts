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

export interface User {
    _id?: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    password?: string;
    profilePicture?: string;
    role: 'passenger' | 'driver' | 'admin';
    isVerified: boolean;
    isActive: boolean;
    lastLogin?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    password: string;
    role?: 'passenger' | 'driver';
}

export interface OTPVerifyRequest {
    email: string;
    otp: string;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    token?: string;
    user?: User;
    requiresOtp?: boolean;
    data?: {
        user: User;
        token: string;
    };
}

// Type guard to check if response has user and token
export function hasAuthData(response: AuthResponse): response is AuthResponse & { user: User; token: string } {
    return !!(response.user && response.token);
}

export function hasNestedAuthData(response: AuthResponse): response is AuthResponse & { data: { user: User; token: string } } {
    return !!(response.data?.user && response.data?.token);
}

export interface PasswordResetRequest {
    email: string;
}

export interface PasswordResetConfirm {
    email: string;
    otp: string;
    newPassword: string;
}