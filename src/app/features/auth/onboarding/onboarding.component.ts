import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, OnboardingRequest } from '../../../services/api.service';

interface City {
  name: string;
  icon: string;
}

interface UserType {
  type: string;
  label: string;
  description: string;
  icon: string;
  gradient: string;
}

interface FormData {
  city: string;
  userType: string;
}

interface Errors {
  [key: string]: string | null;
}

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.scss']
})
export class OnboardingComponent {
  currentStep = 0;
  formData: FormData = {
    city: '',
    userType: ''
  };
  errors: Errors = {};
  isSubmitting: boolean = false;

  cities: City[] = [
    { name: 'Abuja', icon: '🏛️' },
    { name: 'Lagos', icon: '🌆' },
    { name: 'Port Harcourt', icon: '⚓' },
    { name: 'Kano', icon: '🕌' },
    { name: 'Ibadan', icon: '🏘️' },
    { name: 'Other', icon: '📍' }
  ];

  userTypes: UserType[] = [
    {
      type: 'commuter',
      label: 'Regular Commuter',
      description: 'Daily routes & bus stops',
      icon: 'bus',
      gradient: 'gradient-blue'
    },
    {
      type: 'civil_servant',
      label: 'Civil Servant',
      description: 'Work routes & schedules',
      icon: 'briefcase',
      gradient: 'gradient-purple'
    },
    {
      type: 'business_owner',
      label: 'Business Owner',
      description: 'Events & advertising',
      icon: 'building',
      gradient: 'gradient-orange'
    }
  ];

  constructor(
    private router: Router,
    private apiService: ApiService
  ) { }

  getProgress(): number {
    return Math.round(((this.currentStep + 1) / 3) * 100);
  }

  getIcon(iconName: string): string {
    const icons: { [key: string]: string } = {
      bus: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>',
      briefcase: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
      building: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>'
    };
    return icons[iconName] || '';
  }

  validateStep(): boolean {
    this.errors = {};

    if (this.currentStep === 0 && !this.formData.city) {
      this.errors['city'] = 'Please select your city';
    }

    if (this.currentStep === 1 && !this.formData.userType) {
      this.errors['userType'] = 'Please select your user type';
    }

    return Object.keys(this.errors).length === 0;
  }

  handleNext(): void {
    if (this.validateStep()) {
      if (this.currentStep < 2) {
        this.currentStep++;
      }
    }
  }

  handleBack(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.errors = {};
    }
  }

  handleSubmit(): void {
    if (this.validateStep()) {
      console.log('Form submitted:', this.formData);

      this.isSubmitting = true;

      const onboardingRequest: OnboardingRequest = {
        city: this.formData.city,
        userType: this.formData.userType
      };

      console.log('Sending onboarding data:', onboardingRequest);

      this.apiService.completeOnboarding(onboardingRequest).subscribe({
        next: (response) => {
          console.log('Onboarding response:', response);
          this.isSubmitting = false;

          if (response.success) {
            // Move to success step
            this.currentStep = 2;

            // Store completion flag
            localStorage.setItem('onboardingCompleted', 'true');
          } else {
            this.errors['submit'] = response.message || 'Failed to save onboarding data';
          }
        },
        error: (error) => {
          console.error('Onboarding error:', error);
          this.isSubmitting = false;

          if (error.status === 0) {
            this.errors['submit'] = 'Cannot connect to server. Please check your connection.';
          } else {
            this.errors['submit'] = error.error?.message || 'Failed to save onboarding data. Please try again.';
          }
        }
      });
    }
  }

  updateFormData(field: keyof FormData, value: string): void {
    this.formData[field] = value;
    delete this.errors[field];
  }

  clearError(field: string): void {
    delete this.errors[field];
  }

  getUserTypeLabel(): string {
    const userType = this.userTypes.find(type => type.type === this.formData.userType);
    return userType ? userType.label : '';
  }

  finish(): void {
    console.log('Onboarding complete! Redirecting to dashboard...');
    this.router.navigate(['/dashboard']);
  }
}