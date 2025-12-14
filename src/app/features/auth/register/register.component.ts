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
          this.errorMessage = 'Email already registered';
        } else if (error.status === 400) {
          this.errorMessage = error.error?.message || 'Invalid input. Please check your data.';
        } else if (error.status === 0) {
          this.errorMessage = 'Cannot connect to server. Please check your connection.';
        } else {
          this.errorMessage = error.error?.message || 'Registration failed. Please try again.';
        }

        console.error('Registration error details:', error);
      }
    });
  }

  isFormValid(): boolean {
    // Email validation
    const isValidEmail = this.isValidEmail(this.email);

    // Phone validation (at least 10 digits)
    const isValidPhone = this.phone && this.phone.length >= 10;

    // Password validation (at least 6 characters)
    const isValidPassword = this.password && this.password.length >= 6;

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