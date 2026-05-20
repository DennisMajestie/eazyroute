import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { RegisterRequest } from '../../../models/user.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  fullName: string = '';
  email: string = '';
  phone: string = '';
  password: string = '';
  confirmPassword: string = '';
  acceptTerms: boolean = false;
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  isCreating: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  // Focus states
  fullNameFocused: boolean = false;
  emailFocused: boolean = false;
  phoneFocused: boolean = false;
  passwordFocused: boolean = false;
  confirmPasswordFocused: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) { }

  togglePasswordVisibility(field: 'password' | 'confirm'): void {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  onSubmit(): void {
    // Clear messages
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.isFormValid()) {
      this.errorMessage = 'Please fill in all details correctly to continue.';
      return;
    }

    this.isCreating = true;

    const registerRequest: RegisterRequest = {
      email: this.email,
      fullName: this.fullName,
      phone: this.phone,
      password: this.password,
      confirmPassword: this.confirmPassword
    };



    this.authService.register(registerRequest).subscribe({
      next: (response) => {
        this.isCreating = false;

        if (response.success) {
          const hasToken = response.token || response.data?.token || (response.data as any)?.accessToken;

          if (hasToken) {
            // AuthService.register() already called handleAuth() via its tap operator:
            // → token saved to localStorage
            // → isAuthenticated signal set to true
            // → navigation to /onboarding or /dashboard already triggered
            this.successMessage = 'Registration successful! Logging you in...';
            sessionStorage.setItem('isNewRegistration', 'true');

          } else {
            // OTP path — AuthService already navigated to verify-otp
            this.successMessage = 'Registration successful! Redirecting to OTP verification...';
            sessionStorage.setItem('isNewRegistration', 'true');

          }
        } else {
          this.isCreating = false;
          this.errorMessage = response.message || 'We couldn\'t complete your registration. Please try again.';
        }
      },
      error: (error) => {
        this.isCreating = false;

        // Handle different error scenarios
        if (error.status === 409) {
          this.errorMessage = 'This email or phone number is already registered. Try logging in instead!';
        } else if (error.status === 400) {
          if (error.error?.errors && Array.isArray(error.error.errors)) {
            this.errorMessage = error.error.errors.join('. ');
          } else {
            this.errorMessage = error.error?.message || 'Please check your input details. Some fields seem invalid.';
          }
        } else if (error.status === 0) {
          this.errorMessage = 'We can\'t reach our servers right now. Please check your internet connection and try again.';
        } else {
          this.errorMessage = error.error?.message || 'Registration did not complete. Please check your connection and try again.';
        }

        console.error('Registration error details:', error);
      }
    });
  }

  hasMinLength(): boolean {
    return this.password ? this.password.length >= 8 : false;
  }

  hasLowercase(): boolean {
    return this.password ? /(?=.*[a-z])/.test(this.password) : false;
  }

  hasUppercase(): boolean {
    return this.password ? /(?=.*[A-Z])/.test(this.password) : false;
  }

  hasNumber(): boolean {
    return this.password ? /(?=.*\d)/.test(this.password) : false;
  }

  isFormValid(): boolean {
    // Email validation
    const isValidEmail = this.isValidEmail(this.email);

    // Phone validation (at least 10 digits)
    const isValidPhone = this.phone && this.phone.length >= 10;

    // Password validation (aligned with backend: >= 8 chars, lowercase, uppercase, number)
    const isValidPassword = this.password &&
                          this.password.length >= 8 &&
                          /(?=.*[a-z])/.test(this.password) &&
                          /(?=.*[A-Z])/.test(this.password) &&
                          /(?=.*\d)/.test(this.password);

    // Passwords match
    const passwordsMatch = this.password === this.confirmPassword;

    return !!(
      this.fullName &&
      this.fullName.trim().length >= 2 &&
      isValidEmail &&
      isValidPhone &&
      isValidPassword &&
      passwordsMatch &&
      this.acceptTerms
    );
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  loginWithGoogle(): void {
    // Implement Google OAuth later
  }

  loginWithApple(): void {
    // Implement Apple Sign-In later
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}