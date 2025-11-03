import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-donation-page',
  templateUrl: './donation-page.component.html',
  standalone: false,
})
export class DonationPageComponent implements OnInit {
  incidents: any[] = [];
  loading = false;
  donors: Record<string, any[]> = {}; // incidentId → list of donors

  constructor(private http: HttpClient) {}

  async ngOnInit() {
    await this.loadIncidents();
  }

  async loadIncidents() {
    this.loading = true;
    try {
      this.incidents = await firstValueFrom(
        this.http.get<any[]>(`${environment.api_url}api/incidents`)
      );
    } catch (err) {
      console.error('Error loading incidents', err);
    } finally {
      this.loading = false;
    }
  }

  async loadDonors(incidentId: string) {
    if (this.donors[incidentId]) return; // already loaded
    try {
      const list = await firstValueFrom(
        this.http.get<any[]>(`${environment.api_url}api/donations/incident/${incidentId}/donors`)
      );
      this.donors[incidentId] = list;
    } catch (err) {
      console.error('Error loading donors:', err);
    }
  }

  async donate(incidentId: string) {
    const amount = prompt('Enter donation amount:');
    if (!amount) return;

    const bystanderId = localStorage.getItem('bystanderId');
    if (!bystanderId) {
      alert('You must be logged in as a bystander to donate.');
      return;
    }

    try {
      await firstValueFrom(
        this.http.post(`${environment.api_url}api/donations`, {
          incidentId,
          bystanderId,
          amount: parseFloat(amount),
        })
      );
      alert('Thank you for your donation!');
      await this.loadIncidents();
      this.donors[incidentId] = []; // refresh donors for that incident
      await this.loadDonors(incidentId);
    } catch (err) {
      console.error('Donation failed', err);
      alert('Donation failed. Please try again.');
    }
  }

  getDonationPercent(inc: any): number {
    if (!inc.cost || inc.cost === 0) return 0;
    return Math.min(100, Math.round((inc.totalDonated / inc.cost) * 100));
  }
}
