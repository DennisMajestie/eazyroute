// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-login',
//   imports: [],
//   templateUrl: './login.component.html',
//   styleUrl: './login.component.scss'
// })
// export class LoginComponent {

// }


import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';


@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.scss'
})
export class LoginComponent {
    loginForm: FormGroup;
    isLoading = false;
    showPassword = false;
    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router,
        private toastr: ToastrService
    ) {
        this.loginForm = this.fb.group({
            phone: ['', [Validators.required, Validators.pattern(/^0[789][01]\d{8}$/)]],
            password: ['', [Validators.required, Validators.minLength(6)]]
        });
    }
    onSubmit(): void {
        if (this.loginForm.valid) {
            this.isLoading = true;
            this.authService.login(this.loginForm.value).subscribe({
                next: () => {
                    this.toastr.success('Login successful!');
                    this.router.navigate(['/dashboard']);
                },
                error: () => {
                    this.isLoading = false;
                }
            });
        }
    }
    togglePassword(): void {
        this.showPassword = !this.showPassword;
    }
}