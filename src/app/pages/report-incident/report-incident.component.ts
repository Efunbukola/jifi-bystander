import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Geolocation } from '@capacitor/geolocation';
import { Router } from '@angular/router';

@Component({
  selector: 'app-report-incident',
  templateUrl: './report-incident.component.html',
  styleUrls: ['./report-incident.component.scss'],
  standalone: false,
})
export class ReportIncidentComponent implements OnInit {
  incidentForm: FormGroup;
  photoUrls: string[] = [];
  submitting = false;
  message = '';
  error = '';
  location: { lat: number; lng: number } | null = null;

  nearbyIncidents: any[] = [];
  selectedIncidentId: string | null = null;
  loadingIncidents = true;
  checkingLocation = true;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.incidentForm = this.fb.group({
      description: ['', [Validators.required, Validators.minLength(10)]],
      maxResponders: [3, [Validators.required, Validators.min(1), Validators.max(10)]],
    });
  }

  async ngOnInit() {
    await this.loadNearbyIncidents();
  }

  onImageUploaded(event: { url: string; file_name: string }) {
    this.photoUrls.push(event.url);
  }

  onUploadError() {
    this.error = 'Error uploading one or more images.';
  }

  removePhoto(url: string) {
    this.photoUrls = this.photoUrls.filter((p) => p !== url);
  }

  async fetchLocation() {
    try {
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      this.location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      this.checkingLocation = false;
      return true;
    } catch (err) {
      console.warn('⚠️ Could not get location:', err);
      this.error = 'Unable to fetch your location. Please enable GPS.';
      this.checkingLocation = false;
      return false;
    }
  }

  async loadNearbyIncidents() {
    this.loadingIncidents = true;
    this.nearbyIncidents = [];
    this.error = '';
    this.message = '';

    const locationAvailable = await this.fetchLocation();
    if (!locationAvailable || !this.location) {
      this.loadingIncidents = false;
      return;
    }

    try {
      const { lat, lng } = this.location;
      const res: any = await this.http
        .get(`${environment.api_url}api/incidents/nearby?lat=${lat}&lng=${lng}`)
        .toPromise();

      this.nearbyIncidents = res || [];
      if (this.nearbyIncidents.length === 0) {
        this.message = 'No nearby incidents found. You can create a new one below.';
      }
    } catch (err) {
      console.error('Error loading nearby incidents', err);
      this.error = 'Error loading nearby incidents.';
    } finally {
      this.loadingIncidents = false;
    }
  }

  toggleIncidentSelection(incidentId: string) {
    this.selectedIncidentId = this.selectedIncidentId === incidentId ? null : incidentId;
  }

  async submitIncident() {
    if (this.incidentForm.invalid && !this.selectedIncidentId) {
      this.error = 'Please provide a valid description.';
      return;
    }

    const bystanderId = '5c21396c-cf5f-41c4-845b-6a76b258217b'; // TODO: Replace with real auth
    if (!bystanderId) {
      this.error = 'You must be logged in to submit a report.';
      return;
    }

    if (!this.location) {
      await this.fetchLocation();
      if (!this.location) {
        this.error = 'Location not available.';
        return;
      }
    }

    this.submitting = true;
    this.error = '';
    this.message = '';

    try {
      if (this.selectedIncidentId) {
        // ✅ Add media or update existing incident
        const payload = {
          bystanderId,
          photos: this.photoUrls,
          videoUrl: null,
          description: this.incidentForm.value.description || '',
        };
        await this.http
          .put(`${environment.api_url}api/incidents/${this.selectedIncidentId}/media`, payload)
          .toPromise();

        this.message = 'Successfully added to existing incident.';

        this.router.navigate(['/incident-status', this.selectedIncidentId]);

      } else {
        // 🆕 Create a new incident
        const payload = {
          description: this.incidentForm.value.description,
          photos: this.photoUrls,
          videoUrl: null,
          lat: this.location.lat,
          lng: this.location.lng,
          bystanderId,
          maxResponders: this.incidentForm.value.maxResponders,
        };

        const res: any = await this.http
          .post(`${environment.api_url}api/incidents`, payload)
          .toPromise();

        this.message = 'New incident reported successfully.';

        // ✅ Navigate directly to the live status page
        if (res && res.incident._id) {
          this.router.navigate(['/incident-status', res.incident._id]);
        } else if (res && res.incident.id) {
          this.router.navigate(['/incident-status', res.incident.id]);
        }
      }

      // Reset form after submission
      this.incidentForm.reset({ maxResponders: 3 });
      this.photoUrls = [];
      this.selectedIncidentId = null;

      // Reload nearby incidents
      await this.loadNearbyIncidents();
    } catch (err) {
      console.error('Error submitting incident', err);
      this.error = 'Error submitting incident. Please try again.';
    } finally {
      this.submitting = false;
    }
  }

  openPhoto(photoUrl: string) {
    window.open(photoUrl, '_blank');
  }

  openIncident(incidentId: string) {
  this.router.navigate([`/incident-status`, incidentId]);
  }

}
