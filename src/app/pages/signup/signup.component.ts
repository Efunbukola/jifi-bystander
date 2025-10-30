import { Component } from '@angular/core';
import { FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  standalone: false
})
export class SignupComponent {
  loading = false;
  error = '';
  showPassword = false;
  showConfirmPassword = false;

  form = this.fb.group(
    {
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirm_password: ['', Validators.required],
      occupation: [''],
      company: [''],
      city: [''],
      state: [''],
      zip_code: [''],
      secret_question: ['', Validators.required],
      secret_answer: ['', Validators.required],
    },
    { validators: [SignupComponent.passwordsMatchValidator] } // custom validator
  );

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  /** 🔐 Custom validator to ensure passwords match */
  static passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirm = control.get('confirm_password')?.value;
    return password === confirm ? null : { passwordMismatch: true };
  }

  /** 🧾 Submit signup form */
  submit() {
    if (this.form.invalid) return;

    this.loading = true;
    const formValue = { ...this.form.value };
    delete formValue.confirm_password;

    this.auth.signup(formValue).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/d']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Signup failed';
      },
    });
  }

  /** Toggle password visibility */
  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  get passwordMismatch(): boolean {
    return this.form.hasError('passwordMismatch') && this.form.get('confirm_password')?.touched!;
  }
}
