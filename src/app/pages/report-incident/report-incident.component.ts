import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Geolocation } from '@capacitor/geolocation';

@Component({
  selector: 'app-report-incident',
  templateUrl: './report-incident.component.html',
  styleUrls: ['./report-incident.component.scss'],
  standalone: false,
})
export class ReportIncidentComponent {
  incidentForm: FormGroup;
  photoUrls: string[] = [];
  submitting = false;
  message = '';
  error = '';
  location: { lat: number; lng: number } | null = null;

  // Nearby incidents logic
  nearbyIncidents: any[] = [];
  showExistingList = false;
  selectedIncidentId: string | null = null;
  checkingNearby = false;

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.incidentForm = this.fb.group({
      description: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  // Called when an image uploader component emits a URL
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
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
      });
      this.location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      console.log('[GPS] Location fetched:', this.location);
    } catch (err) {
      console.warn('⚠️ Could not get location:', err);
      this.error = 'Unable to fetch your location. Please enable GPS.';
    }
  }

  /**
   * Step 1 — Check for existing nearby incidents
   */
  async checkNearbyIncidents() {
    this.error = '';
    this.nearbyIncidents = [];
    this.showExistingList = false;
    this.checkingNearby = true;

    if (!this.location) {
      await this.fetchLocation();
      if (!this.location) {
        this.error = 'Location not available. Please enable GPS.';
        this.checkingNearby = false;
        return;
      }
    }

    try {
      const { lat, lng } = this.location;
      const res: any = await this.http
        .get(`${environment.api_url}api/incidents/nearby?lat=${lat}&lng=${lng}`)
        .toPromise();

      this.nearbyIncidents = res || [];
      this.showExistingList = this.nearbyIncidents.length > 0;

      if (!this.showExistingList) {
        this.message = 'No nearby incidents found. You can report a new one.';
      } else {
        this.message = '';
      }
    } catch (err) {
      console.error('Error checking nearby incidents', err);
      this.error = 'Error fetching nearby incidents.';
    } finally {
      this.checkingNearby = false;
    }
  }

  /**
   * Step 2 — Submit new or attach to existing
   */
  async submitIncident() {
    if (this.incidentForm.invalid && !this.selectedIncidentId) {
      this.error = 'Please provide a valid description.';
      return;
    }

    const bystanderId = '5c21396c-cf5f-41c4-845b-6a76b258217b'; // Replace with auth
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
        // 🟢 Add photos to existing incident
        const payload = {
          bystanderId,
          photos: this.photoUrls,
        };

        await this.http
          .put(
            `${environment.api_url}api/incidents/${this.selectedIncidentId}/media`,
            payload
          )
          .toPromise();

        this.message = 'Media added to existing incident successfully.';
      } else {
        // 🔴 Create a new incident
        const payload = {
          description: this.incidentForm.value.description,
          photos: this.photoUrls,
          videoUrl: null,
          lat: this.location.lat,
          lng: this.location.lng,
          bystanderId,
        };

        await this.http
          .post(`${environment.api_url}api/incidents`, payload)
          .toPromise();

        this.message = 'New incident reported successfully.';
      }

      // Reset
      this.submitting = false;
      this.incidentForm.reset();
      this.photoUrls = [];
      this.selectedIncidentId = null;
      this.showExistingList = false;
    } catch (err) {
      console.error('Error submitting incident', err);
      this.error = 'Error submitting incident. Please try again.';
    } finally {
      this.submitting = false;
    }
  }
}
