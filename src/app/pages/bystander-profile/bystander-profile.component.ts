import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-bystander-profile',
  templateUrl: './bystander-profile.component.html',
  standalone: false,
})
export class BystanderProfileComponent implements OnInit {
  loading = false;
  message = '';
  passwordMessage = '';
  showNewPassword = false;
  profile: any;

  // Profile update form
  form = this.fb.group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    occupation: [''],
    company: [''],
    city: [''],
    state: [''],
    zip_code: [''],
  });

  // Password update form
  passwordForm = this.fb.group({
    current_password: ['', Validators.required],
    new_password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  /** Load logged-in bystander's profile */
  loadProfile() {
    this.loading = true;
    this.http.get(`${environment.api_url}api/bystanders/me`).subscribe({
      next: (data: any) => {
        this.profile = data;
        this.form.patchValue(data);
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load profile:', err);
        this.loading = false;
      },
    });
  }

  /** Save updated profile info */
  saveProfile() {
    if (this.form.invalid) return;
    this.loading = true;

    this.http
      .put(`${environment.api_url}api/bystanders/update-profile`, this.form.value)
      .subscribe({
        next: (res: any) => {
          this.message = res.message || 'Profile updated successfully';
          this.loading = false;

          // Update cached data
          const current = this.auth.getUser();
          if (current) {
            const updated = { ...current, ...this.form.value };
            localStorage.setItem('auth', JSON.stringify(updated));
          }
        },
        error: (err) => {
          console.error('Error saving profile:', err);
          this.loading = false;
        },
      });
  }

  /** Update password */
  updatePassword() {
    if (this.passwordForm.invalid) return;

    this.loading = true;
    this.http
      .put(`${environment.api_url}api/bystanders/update-password`, this.passwordForm.value)
      .subscribe({
        next: (res: any) => {
          this.passwordMessage = res.message || 'Password updated successfully';
          this.passwordForm.reset();
          this.loading = false;
        },
        error: (err) => {
          console.error('Error updating password:', err);
          this.passwordMessage =
            err.error?.error || 'Failed to update password. Please try again.';
          this.loading = false;
        },
      });
  }

  togglePasswordVisibility() {
    this.showNewPassword = !this.showNewPassword;
  }

  signOut() {
  this.auth.logout();
}
}
