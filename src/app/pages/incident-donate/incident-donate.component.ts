import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-incident-donate',
  templateUrl: './incident-donate.component.html',
  standalone:false
})
export class IncidentDonateComponent implements OnInit {
  incident: any;
  loading = true;
  error = '';
  user: any = null;

  constructor(private route: ActivatedRoute, private http: HttpClient,  private auth: AuthService) {}

  async ngOnInit() {

    this.user = this.auth.getUser(); // contains bystanderId
  
    if (!this.user || !this.user.bystanderId) {
      this.error = 'You must be logged in to donate.'
      this.loading = false;
      return;
    }


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
