import { Component, Input, Output, EventEmitter, AfterViewInit } from '@angular/core';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { environment } from 'src/environments/environment';

@Component({
  selector: "app-stripe-add-card",
  standalone:false,
  template: `
    <div id="setup-card-element"></div>
    <button
      (click)="submit()"
      class="mt-3 bg-blue-600 text-white py-2 px-4 rounded-lg"
    >
      Save Card
    </button>
  `
})
export class StripeAddCardComponent implements AfterViewInit {
  @Input() clientSecret!: string;
  @Output() completed = new EventEmitter<void>();

  stripe: Stripe | null = null;
  elements!: StripeElements;

  async ngAfterViewInit() {

    this.stripe = await loadStripe(environment.stripe_public_key);

    
    if (!this.stripe) {
      console.error("Stripe failed to load.");
      return;
    }

    this.elements = this.stripe.elements({ clientSecret: this.clientSecret });

    const card = this.elements.create("payment");
    card.mount("#setup-card-element");
  }

  async submit() {

     if (!this.stripe) {
      console.error("Stripe failed to load.");
      return;
    }

    const result = await this.stripe.confirmSetup({
      elements: this.elements,
      redirect: "if_required",
    });

    if (!result.error) this.completed.emit();
  }
}
