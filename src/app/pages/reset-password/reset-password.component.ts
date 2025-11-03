import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  standalone: false,
})
export class ResetPasswordComponent {
  step = 1; // 1 = get question, 2 = verify + reset
  loading = false;
  error = '';
  message = '';
  secretQuestion = '';
  email = '';

  formEmail = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  formReset = this.fb.group({
    secret_answer: ['', Validators.required],
    new_password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor(private fb: FormBuilder, private http: HttpClient, private router: Router) {}

  /** Step 1: Request secret question */
  getSecretQuestion() {
    if (this.formEmail.invalid) return;
    this.loading = true;
    this.error = '';
    this.message = '';

    this.email = this.formEmail.value.email!;

    this.http
      .post(`${environment.api_url}api/bystanders/get-secret-question`, { email: this.email })
      .subscribe({
        next: (res: any) => {
          this.secretQuestion = res.secret_question;
          this.step = 2;
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.error = err.error?.error || 'Unable to retrieve secret question';
        },
      });
  }

  /** Step 2: Submit answer + reset password */
  resetPassword() {
    if (this.formReset.invalid) return;
    this.loading = true;
    this.error = '';
    this.message = '';

    const payload = {
      email: this.email,
      secret_answer: this.formReset.value.secret_answer,
      new_password: this.formReset.value.new_password,
    };

    this.http
      .post(`${environment.api_url}api/bystanders/reset-password`, payload)
      .subscribe({
        next: (res: any) => {
          this.message = res.message || 'Password reset successful!';
          this.loading = false;
          setTimeout(() => this.router.navigate(['/login']), 2000);
        },
        error: (err) => {
          this.loading = false;
          this.error = err.error?.error || 'Reset failed';
        },
      });
  }

  backToEmail() {
    this.step = 1;
    this.secretQuestion = '';
    this.formReset.reset();
    this.message = '';
    this.error = '';
  }
}
