// import { Component } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { Router } from '@angular/router';

// @Component({
//   selector: 'app-forgot-password',
//   standalone: true,
//   imports: [CommonModule, FormsModule],
//   templateUrl: './forgot-password.component.html',
//   styleUrls: ['./forgot-password.component.scss']
// })
// export class ForgotPasswordComponent {
//   email: string = '';
//   isSending: boolean = false;
//   emailSent: boolean = false;
//   emailFocused: boolean = false;

//   constructor(private router: Router) { }

//   onSubmit(): void {
//     if (this.email) {
//       this.isSending = true;

//       setTimeout(() => {
//         this.isSending = false;
//         this.emailSent = true;
//         console.log('Reset link sent to:', this.email);
//       }, 2000);
//     }
//   }

//   goToLogin(): void {
//     console.log('Navigate to login');
//     // this.router.navigate(['/login']);
//   }

//   resendEmail(): void {
//     this.emailSent = false;
//     this.onSubmit();
//   }
// }


import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit {
  emailSent = false;
  password: string = '';
  confirmPassword: string = '';
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  isResetting: boolean = false;
  passwordReset: boolean = false;
  token: string = '';

  passwordFocused: boolean = false;
  confirmPasswordFocused: boolean = false;

  // Password strength
  passwordStrength: number = 0;
  passwordRequirements = {
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    // Get token from URL
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
    });
  }

  onPasswordChange(): void {
    this.checkPasswordStrength();
  }

  checkPasswordStrength(): void {
    const pwd = this.password;

    this.passwordRequirements.minLength = pwd.length >= 8;
    this.passwordRequirements.hasUpperCase = /[A-Z]/.test(pwd);
    this.passwordRequirements.hasLowerCase = /[a-z]/.test(pwd);
    this.passwordRequirements.hasNumber = /[0-9]/.test(pwd);
    this.passwordRequirements.hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);

    const metRequirements = Object.values(this.passwordRequirements).filter(Boolean).length;
    this.passwordStrength = (metRequirements / 5) * 100;
  }

  getPasswordStrengthLabel(): string {
    if (this.passwordStrength === 0) return '';
    if (this.passwordStrength < 40) return 'Weak';
    if (this.passwordStrength < 80) return 'Medium';
    return 'Strong';
  }

  getPasswordStrengthColor(): string {
    if (this.passwordStrength < 40) return '#ef4444';
    if (this.passwordStrength < 80) return '#f59e0b';
    return '#10b981';
  }

  togglePasswordVisibility(field: 'password' | 'confirm'): void {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  isFormValid(): boolean {
    return !!(
      this.password &&
      this.confirmPassword &&
      this.password === this.confirmPassword &&
      this.passwordStrength === 100
    );
  }

  onSubmit(): void {
    if (this.isFormValid()) {
      this.isResetting = true;

      setTimeout(() => {
        this.isResetting = false;
        this.passwordReset = true;
        console.log('Password reset successful');

        // Redirect to login after 3 seconds
        setTimeout(() => {
          this.goToLogin();
        }, 3000);
      }, 2000);
    }
  }

  goToLogin(): void {
    console.log('Navigate to login');
    // this.router.navigate(['/login']);
  }
}