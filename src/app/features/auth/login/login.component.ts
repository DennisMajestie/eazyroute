import { Component, OnDestroy } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service'; // ⬅️ Change this
import { LoginRequest } from '../../../models/user.model'; // ⬅️ Use correct model

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnDestroy {
    email: string = '';
    password: string = '';
    rememberMe: boolean = false;
    showPassword: boolean = false;
    isAuthenticating: boolean = false;
    emailFocused: boolean = false;
    passwordFocused: boolean = false;
    errorMessage: string = '';
    successMessage: string = '';
    isGoogleAuthenticating: boolean = false;
    isAppleAuthenticating: boolean = false;
    isWakeUpWaiting: boolean = false;
    private wakeUpTimer: any;

    constructor(
        private router: Router,
        private authService: AuthService
    ) { }

    ngOnDestroy(): void {
        if (this.wakeUpTimer) clearTimeout(this.wakeUpTimer);
    }

    togglePasswordVisibility(): void {
        this.showPassword = !this.showPassword;
    }

    onSubmit(): void {
        this.errorMessage = '';
        this.successMessage = '';
        this.isWakeUpWaiting = false;

        if (!this.email || !this.password) {
            this.errorMessage = 'Please enter email and password';
            return;
        }

        if (!this.isValidEmail(this.email)) {
            this.errorMessage = 'Please enter a valid email';
            return;
        }

        this.isAuthenticating = true;

        // Render Cold Start Warning: Show message if request takes > 10s
        this.wakeUpTimer = setTimeout(() => {
            if (this.isAuthenticating) {
                this.isWakeUpWaiting = true;
            }
        }, 10000);

        const loginRequest: LoginRequest = {
            email: this.email,
            password: this.password
        };

        this.authService.login(loginRequest).subscribe({
            next: (response) => {
                this.isAuthenticating = false;
                this.isWakeUpWaiting = false;
                if (this.wakeUpTimer) clearTimeout(this.wakeUpTimer);

                if (response.success) {
                    console.log('✅ Login successful');

                    // Store rememberMe preference
                    if (this.rememberMe) {
                        localStorage.setItem('rememberMe', 'true');
                    }

                    this.successMessage = 'Login successful! Redirecting...';
                    // AuthService handles navigation automatically
                } else {
                    this.errorMessage = response.message || 'Login failed';
                }
            },
            error: (error) => {
                this.isAuthenticating = false;
                this.isWakeUpWaiting = false;
                if (this.wakeUpTimer) clearTimeout(this.wakeUpTimer);

                if (error.status === 401) {
                    this.errorMessage = 'Invalid email or password';
                } else if (error.status === 403) {
                    this.errorMessage = 'Please verify your email first';
                    setTimeout(() => {
                        this.router.navigate(['/auth/verify-otp'], {
                            queryParams: {
                                email: this.email,
                                fromLogin: 'true'
                            }
                        });
                    }, 2000);
                } else {
                    this.errorMessage = error.error?.message || 'Login failed. Please try again.';
                }

                console.error('❌ Login error:', error);
            }
        });
    }
    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    loginWithGoogle(): void {
        this.isGoogleAuthenticating = true;
        this.errorMessage = '';
        this.authService.loginWithGoogle();

        // Use a timeout to reset state if prompt doesn't open
        setTimeout(() => this.isGoogleAuthenticating = false, 3000);
    }

    loginWithApple(): void {
        this.isAppleAuthenticating = true;
        this.errorMessage = '';
        this.authService.loginWithApple();

        // Reset state after attempt
        setTimeout(() => this.isAppleAuthenticating = false, 2000);
    }

    goToSignup(): void {
        this.router.navigate(['/signup']);
    }

    goToForgotPassword(): void {
        this.router.navigate(['/forgot-password']);
    }
}