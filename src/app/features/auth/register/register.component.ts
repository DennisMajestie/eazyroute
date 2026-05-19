import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, RegisterRequest } from '../../../services/api.service';

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
    private apiService: ApiService
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
      this.errorMessage = 'Please fill all fields correctly';
      return;
    }

    this.isCreating = true;
    console.log('Starting registration...');

    const registerRequest: RegisterRequest = {
      email: this.email,
      fullName: this.fullName,
      phone: this.phone,
      password: this.password,
      confirmPassword: this.confirmPassword
    };

    console.log('Register request:', registerRequest);

    this.apiService.register(registerRequest).subscribe({
      next: (response) => {
        console.log('Registration response:', response);
        this.isCreating = false;

        if (response.success) {
          const hasToken = response.token || response.data?.token || response.data?.accessToken;
          if (hasToken) {
            this.successMessage = 'Registration successful! Logging you in...';
            console.log('Registration successful (Bypassed OTP)', response.data);

            // Store that this is a new registration for the onboarding flow
            sessionStorage.setItem('isNewRegistration', 'true');

            // Redirect directly to dashboard or onboarding after 2 seconds
            setTimeout(() => {
              const user = response.user || response.data?.user;
              const hasCompletedOnboarding = user?.onboardingComplete === true;
              if (hasCompletedOnboarding) {
                console.log('Navigating directly to dashboard...');
                this.router.navigate(['/dashboard']);
              } else {
                console.log('Navigating directly to onboarding...');
                this.router.navigate(['/onboarding']);
              }
            }, 2000);
          } else {
            this.successMessage = 'Registration successful! Redirecting to OTP verification...';
            console.log('Registration successful', response.data);

            // Store that this is a new registration for the onboarding flow
            sessionStorage.setItem('isNewRegistration', 'true');

            // Redirect to OTP verification page after 2 seconds
            setTimeout(() => {
              console.log('Navigating to verify-otp...');
              this.router.navigate(['/auth/verify-otp'], {
                queryParams: {
                  email: this.email,
                  fromRegistration: 'true' // Add this flag
                }
              }).then(success => {
                console.log('Navigation success:', success);
              }).catch(err => {
                console.error('Navigation error:', err);
              });
            }, 2000);
          }
        } else {
          this.isCreating = false;
          this.errorMessage = response.message || 'Registration failed';
        }
      },
      error: (error) => {
        console.log('Registration error:', error);
        this.isCreating = false;

        // Handle different error scenarios
        if (error.status === 409) {
          this.errorMessage = 'Email or phone number already registered.';
        } else if (error.status === 400) {
          if (error.error?.errors && Array.isArray(error.error.errors)) {
            this.errorMessage = error.error.errors.join('. ');
          } else {
            this.errorMessage = error.error?.message || 'Invalid input. Please check your data.';
          }
        } else if (error.status === 0) {
          this.errorMessage = 'Cannot connect to server. Please check your connection.';
        } else {
          this.errorMessage = error.error?.message || 'Registration failed. Please try again.';
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
    console.log('Google OAuth initiated');
    // Implement Google OAuth later
  }

  loginWithApple(): void {
    console.log('Apple Sign-In initiated');
    // Implement Apple Sign-In later
  }

  goToLogin(): void {
    console.log('Navigate to login');
    this.router.navigate(['/login']);
  }
}