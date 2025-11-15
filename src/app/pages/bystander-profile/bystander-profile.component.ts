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
  savedCards: any[] = [];
  cardsLoading = false;
  addingCard = false;
  setupClientSecret = '';
  deletingCardId: string | null = null;
  settingDefaultId: string | null = null;
  defaultPaymentMethod: string | null = null;

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
    new_password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(25)]],
  });

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
    this.loadCards();
  }

  
async loadCards() {
  this.cardsLoading = true;

  this.http.get(`${environment.api_url}api/cards/list`).subscribe((cards: any) => {
    this.savedCards = cards;
    this.cardsLoading = false;

    // find default card from Stripe customer object
    this.http.get(`${environment.api_url}api/bystanders/me`).subscribe((user: any) => {
      this.defaultPaymentMethod = user?.defaultPaymentMethod || null;
    });
  });
}

startAddCard() {
  this.addingCard = true;
  this.setupClientSecret = ''; // clear old secret

  this.http.post(`${environment.api_url}api/cards/create-setup-intent`, {})
    .subscribe((res: any) => {
      if (!res.clientSecret) {
        console.error("❌ No client secret returned!");
        this.addingCard = false;
        return;
      }

      console.log("Retrieved secret:", res.clientSecret);
      this.setupClientSecret = res.clientSecret; // 🔥 only now ready
    });
}

onCardAdded() {
  this.addingCard = false;
  this.loadCards();
}

deleteCard(id: string) {
  this.deletingCardId = id;

  this.http.delete(`${environment.api_url}api/cards/delete/${id}`).subscribe(() => {
    this.deletingCardId = null;
    this.loadCards();
  });
}

setDefault(id: string) {
  this.settingDefaultId = id;

  this.http.post(`${environment.api_url}api/cards/set-default`, { pmId: id })
    .subscribe(() => {
      this.settingDefaultId = null;
      this.defaultPaymentMethod = id;
      this.loadCards();
    });
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

confirmDeactivate() {
  const confirmed = confirm(
    "Are you sure you want to deactivate your account? This will sign you out immediately."
  );

  if (!confirmed) return;

  this.deactivateAccount();
}

deactivateAccount() {
  this.loading = true;

  this.http.post(`${environment.api_url}api/bystanders/deactivate`, {
    reason: "User chose to deactivate"
  })
  .subscribe({
    next: (res: any) => {
      alert("Your account has been deactivated.");
      this.auth.logout(); // auto-logout
    },
    error: (err) => {
      console.error("Error deactivating account:", err);
      alert("Failed to deactivate account. Please try again.");
      this.loading = false;
    }
  });
}


}
