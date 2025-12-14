import { Component, OnInit, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service'; // ⬅️ Change this

@Component({
  selector: 'app-otp-verify',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './otp-verify.component.html',
  styleUrls: ['./otp-verify.component.scss']
})
export class OtpVerifyComponent implements OnInit {
  @ViewChildren('codeInput') codeInputs!: QueryList<ElementRef<HTMLInputElement>>;

  code: string[] = ['', '', '', '', '', ''];
  isVerifying: boolean = false;
  verificationComplete: boolean = false;
  verificationError: boolean = false;
  email: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  isResending: boolean = false;
  fromRegistration: boolean = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService // ⬅️ Change this
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || '';
      this.fromRegistration = params['fromRegistration'] === 'true';

      console.log('Email for OTP verification:', this.email);
      console.log('From registration:', this.fromRegistration);

      if (!this.email) {
        console.error('No email provided for OTP verification');
        this.errorMessage = 'Email not found. Please register again.';
        setTimeout(() => {
          this.router.navigate(['/auth/register']);
        }, 3000);
      }
    });
  }


  onCodeInput(index: number, event: any): void {
    const value = event.target.value;

    if (value && /^\d$/.test(value)) {
      this.code[index] = value;
      this.verificationError = false;
      this.errorMessage = '';

      if (index < 5) {
        const inputs = this.codeInputs.toArray();
        inputs[index + 1]?.nativeElement.focus();
      }

      if (index === 5 &&
        this.code.every(digit => digit !== '') &&
        !this.isVerifying &&
        !this.verificationComplete) {
        this.verifyCode();
      }
    }
  }

  onKeyDown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.code[index] && index > 0) {
      const inputs = this.codeInputs.toArray();
      inputs[index - 1]?.nativeElement.focus();
    }

    if (event.key === 'v' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.handlePaste();
    }
  }

  handlePaste(): void {
    navigator.clipboard.readText().then(text => {
      const digits = text.replace(/\D/g, '').slice(0, 6);
      digits.split('').forEach((digit, index) => {
        if (index < 6) {
          this.code[index] = digit;
        }
      });

      if (digits.length === 6 && !this.isVerifying && !this.verificationComplete) {
        this.verifyCode();
      }
    });
  }

  verifyCode(): void {
    console.log('🔴 verifyCode() called');

    const fullCode = this.code.join('');

    if (fullCode.length !== 6) {
      this.errorMessage = 'Please enter all 6 digits';
      return;
    }

    if (!this.email) {
      this.errorMessage = 'Email not found. Please register again.';
      return;
    }

    if (this.isVerifying || this.verificationComplete) {
      console.log('Verification already in progress or completed');
      return;
    }

    this.isVerifying = true;
    this.verificationError = false;
    this.errorMessage = '';
    this.successMessage = '';

    const verifyRequest = {
      email: this.email,
      otp: fullCode
    };

    console.log('📤 Sending OTP verification request:', verifyRequest);

    // ⬅️ Use AuthService instead
    this.authService.verifyOTP(verifyRequest).subscribe({
      next: (response: any) => {
        console.log('🎯 OTP Verification Response:', response);

        this.isVerifying = false;

        if (!response) {
          this.verificationError = true;
          this.errorMessage = 'No response from server';
          this.clearCode();
          return;
        }

        if (response.success) {
          this.verificationComplete = true;
          this.successMessage = 'Verification successful! Redirecting...';

          // AuthService.handleAuth() already saves token and navigates
          // based on onboarding status
        } else {
          this.verificationError = true;
          this.errorMessage = response.message || 'Invalid verification code';
          this.clearCode();
        }
      },

      error: (error) => {
        console.error('❌ OTP Verification Error:', error);
        this.isVerifying = false;
        this.verificationError = true;

        if (error.status === 400) {
          this.errorMessage = error.error?.message || 'Invalid verification code';
        } else if (error.status === 404) {
          this.errorMessage = 'User not found. Please register again.';
        } else if (error.status === 410) {
          this.errorMessage = 'Verification code expired. Please request a new one.';
        } else if (error.status === 429) {
          // ⬅️ Handle rate limiting
          this.errorMessage = 'Too many attempts. Please wait a few minutes and try again.';
        } else if (error.status === 0) {
          this.errorMessage = 'Cannot connect to server';
        } else {
          this.errorMessage = error.error?.message || 'Verification failed';
        }

        this.clearCode();
      }
    });
  }

  resendCode(): void {
    if (!this.email || this.isVerifying || this.isResending) {
      return;
    }

    this.isResending = true;
    this.errorMessage = '';
    this.successMessage = '';

    // ⬅️ You'll need to add a resendOTP method to AuthService
    // For now, keep using ApiService or implement in AuthService
    const resendRequest = { email: this.email };

    // TODO: Implement authService.resendOTP()
    // this.authService.resendOTP(resendRequest).subscribe({...});

    // Temporary: You can keep this as is for now
    this.isResending = false;
    this.successMessage = 'Verification code sent!';
  }

  clearCode(): void {
    this.code = ['', '', '', '', '', ''];
    setTimeout(() => {
      const inputs = this.codeInputs.toArray();
      inputs[0]?.nativeElement.focus();
    }, 100);
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}