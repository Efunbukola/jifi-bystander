import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-incident-donate',
  templateUrl: './incident-donate.component.html',
  standalone:false
})
export class IncidentDonateComponent implements OnInit {
  incident: any;
  loading = true;
  error = '';

  constructor(private route: ActivatedRoute, private http: HttpClient) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    try {
      const res: any = await this.http.get(`${environment.api_url}api/incidents/${id}`).toPromise();
      this.incident = res;
    } catch (err) {
      this.error = 'Unable to load incident.';
    } finally {
      this.loading = false;
    }
  }
}
