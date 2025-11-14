import {
  Component,
  Input,
  OnInit
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-stripe-donation',
  templateUrl: './stripe-donation.component.html',
  standalone: false,
})
export class StripeDonationComponent implements OnInit {

  @Input() incidentId!: string;
  @Input() bystanderId!: string;

  amount = 0;

  savedCards: any[] = [];
  selectedCard: string | null = null;

  loading = false;
  error = '';
  message = '';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadCards();
  }

  
  loadCards() {
    this.http.get(`${environment.api_url}api/cards/list`)
      .subscribe((cards: any) => {
        this.savedCards = cards;

        // Auto-select default card
        const defaultCard = cards.find((c: any) => c.isDefault);
        this.selectedCard = defaultCard ? defaultCard.id : null;
      });
  }

  async donate() {
    if (!this.amount || this.amount <= 0) {
      this.error = 'Please enter a valid amount.';
      return;
    }

    if (!this.selectedCard) {
      this.error = 'Please select a card.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.message = '';

    try {
      const res: any = await this.http.post(
        `${environment.api_url}api/stripe-donations/charge-donation`,
        {
          incidentId: this.incidentId,
          bystanderId: this.bystanderId,
          amount: this.amount,
          paymentMethodId: this.selectedCard
        }
      ).toPromise();

      if (res.status === 'success') {
        this.message = 'Donation successful 💚';

        setTimeout(() => {
          this.router.navigate(['/d/donations']);
        }, 1500);
      } else {
        this.error = res.message || 'Payment failed.';
      }

    } catch (err: any) {
      console.error('Donation error:', err);
      this.error = err.error?.message || 'Unable to complete donation.';
    } finally {
      this.loading = false;
    }
  }

}

