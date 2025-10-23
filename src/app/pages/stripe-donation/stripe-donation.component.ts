import { Component, Input, AfterViewInit, OnDestroy, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { loadStripe, Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';

@Component({
  selector: 'app-stripe-donation',
  templateUrl: './stripe-donation.component.html',
  standalone: false,
})
export class StripeDonationComponent implements AfterViewInit, OnDestroy {
  @Input() incidentId!: string;
  @Input() bystanderId!: string;

  amount: number = 0;
  stripe: Stripe | null = null;
  elements!: StripeElements;
  paymentElement!: StripePaymentElement;
  clientSecret = '';
  loading = false;
  message = '';
  error = '';

  constructor(private http: HttpClient, private el: ElementRef, private router: Router) {}

  // ✅ Initialize Stripe after view loads
  async ngAfterViewInit() {
    this.stripe = await loadStripe(environment.stripe_public_key);
  }

  // ✅ Step 1: Create PaymentIntent from backend and mount payment UI
  async startPayment() {
    if (!this.amount || this.amount <= 0) {
      this.error = 'Please enter a valid amount.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.message = '';

    try {
      const res: any = await this.http
        .post(`${environment.api_url}api/stripe-donations/create-intent`, {
          incidentId: this.incidentId,
          bystanderId: this.bystanderId,
          amount: this.amount,
        })
        .toPromise();

      this.clientSecret = res.clientSecret;
      await this.mountCard();
    } catch (err: any) {
      console.error('Stripe startPayment error:', err);
      this.error = err.error?.message || 'Failed to start donation.';
    } finally {
      this.loading = false;
    }
  }

  // ✅ Step 2: Safely mount Stripe’s payment element after DOM exists
  async mountCard() {
    if (!this.stripe || !this.clientSecret) return;

    const container = this.el.nativeElement.querySelector('#payment-element');
    if (!container) {
      console.warn('⚠️ Payment element container not found — retrying...');
      setTimeout(() => this.mountCard(), 300);
      return;
    }

    this.elements = this.stripe.elements({ clientSecret: this.clientSecret });
    this.paymentElement = this.elements.create('payment');
    this.paymentElement.mount('#payment-element');
  }

  // ✅ Step 3: Confirm payment and navigate back
  async confirmPayment() {
    if (!this.stripe || !this.clientSecret) return;

    this.loading = true;
    this.error = '';
    this.message = '';

    const { error, paymentIntent } = await this.stripe.confirmPayment({
      elements: this.elements,
      confirmParams: {
        return_url: window.location.href, // or handle manually
      },
      redirect: 'if_required',
    });

    if (error) {
      console.error('Stripe confirmPayment error:', error);
      this.error = error.message || 'Payment failed.';
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      this.message = 'Donation successful 💚';
      // ✅ Navigate back to Donations after 1.5s
      setTimeout(() => {
        this.router.navigate(['/d/donations']);
      }, 1500);
    }

    this.loading = false;
  }

  // ✅ Cleanup on destroy
  ngOnDestroy() {
    if (this.paymentElement) {
      try {
        this.paymentElement.unmount();
      } catch (err) {
        console.warn('⚠️ Stripe element cleanup failed:', err);
      }
    }
  }
}
