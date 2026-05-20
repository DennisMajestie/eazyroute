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



      if (!this.email) {
        console.error('No email provided for OTP verification');
        this.errorMessage = 'Email not found. Please register to get started.';
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


    const fullCode = this.code.join('');

    if (fullCode.length !== 6) {
      this.errorMessage = 'Please enter all 6 digits of your verification code.';
      return;
    }

    if (!this.email) {
      this.errorMessage = 'Email not found. Please register to get started.';
      return;
    }

    if (this.isVerifying || this.verificationComplete) {
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



    // ⬅️ Use AuthService instead
    this.authService.verifyOTP(verifyRequest).subscribe({
      next: (response: any) => {
        this.isVerifying = false;

        if (!response) {
          this.verificationError = true;
          this.errorMessage = 'The verification server didn\'t respond. Please check your connection.';
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
          this.errorMessage = response.message || 'Invalid verification code. Please check the code and try again.';
          this.clearCode();
        }
      },

      error: (error) => {
        console.error('❌ OTP Verification Error:', error);
        this.isVerifying = false;
        this.verificationError = true;

        if (error.status === 400) {
          this.errorMessage = error.error?.message || 'The verification code you entered is invalid. Please check the code and try again.';
        } else if (error.status === 404) {
          this.errorMessage = 'We couldn\'t find your account. Please sign up to register.';
        } else if (error.status === 410) {
          this.errorMessage = 'Your verification code has expired. Please click resend to request a new code.';
        } else if (error.status === 429) {
          // ⬅️ Handle rate limiting
          this.errorMessage = 'Too many incorrect attempts. Please wait a few minutes before trying again.';
        } else if (error.status === 0) {
          this.errorMessage = 'Cannot connect to server. Please check your internet connection and try again.';
        } else {
          this.errorMessage = error.error?.message || 'Verification failed. Please check the code and try again.';
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

    const resendRequest = { email: this.email };
    // ⬅️ Use AuthService instead
    this.authService.resendOTP(resendRequest).subscribe({
      next: (response) => {
        this.isResending = false;
        if (response.success) {
          this.successMessage = 'Verification code sent successfully!';
          this.code = ['', '', '', '', '', '']; // Clear previous code
        } else {
          this.errorMessage = response.message || 'Failed to resend verification code. Please try again.';
        }
      },
      error: (error) => {
        this.isResending = false;
        console.error('❌ Resend OTP Error:', error);

        if (error.status === 429) {
          this.errorMessage = 'Please wait a bit before requesting another verification code.';
        } else if (error.status === 0) {
          this.errorMessage = 'We couldn\'t connect to our server. Please check your internet connection.';
        } else {
          this.errorMessage = error.error?.message || 'We couldn\'t resend the verification code. Please check your connection and try again.';
        }
      }
    });
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