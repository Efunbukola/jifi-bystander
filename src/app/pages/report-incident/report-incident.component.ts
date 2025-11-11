import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Geolocation } from '@capacitor/geolocation';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';


@Component({
  selector: 'app-report-incident',
  templateUrl: './report-incident.component.html',
  styleUrls: ['./report-incident.component.scss'],
  standalone: false,
})
export class ReportIncidentComponent implements OnInit {
  incidentForm: FormGroup;
  photoUrls: string[] = [];
  videoUrl: string | null = null;

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
    private router: Router,
    private auth: AuthService // ✅ inject auth service
  ) {
    this.incidentForm = this.fb.group({
      description: ['', [Validators.required, Validators.minLength(10)]],
      severity: [5, [Validators.required, Validators.min(1), Validators.max(10)]],
      numberOfCasualties: [1, [Validators.required, Validators.min(1)]],
    });
  }

  async ngOnInit() {
    await this.loadNearbyIncidents();
  }

  /** Handle image upload */
  onImageUploaded(event: { url: string; file_name: string }) {
    console.log('[ReportIncident] Image uploaded:', event);
    this.photoUrls.push(event.url);
  }

  /** Handle video upload */
  onVideoUploaded(event: { url: string; file_name: string }) {
    console.log('[ReportIncident] Video uploaded:', event);
    this.videoUrl = event.url;
  }

  /** Remove uploaded video */
  removeVideo() {
    console.log('[ReportIncident] Removing video...');
    this.videoUrl = null;
  }

  /** Common upload error handler */
  onUploadError() {
    this.error = 'Error uploading one or more media files.';
    console.error('[ReportIncident] Upload error');
  }

  /** Remove a photo from list */
  removePhoto(url: string) {
    this.photoUrls = this.photoUrls.filter((p) => p !== url);
  }

/** Get user location (works on Android and in browser) */
//SWITCH BACK TO ANDROID ONLY IMPLEMENTATION
async fetchLocation() {
  this.checkingLocation = true;
  this.error = '';

  try {
    console.log('[ReportIncident] 🌍 Fetching location...');

    // Try Capacitor Geolocation first (Android/iOS)
    try {
      const permResult = await Geolocation.requestPermissions();
      console.log('[ReportIncident] 🧭 Permission result:', permResult);

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds timeout
      });

      this.location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      console.log('[ReportIncident] ✅ Got location via Capacitor:', this.location);
      this.checkingLocation = false;
      return true;
    } catch (capError) {
      console.warn('[ReportIncident] ⚠️ Capacitor Geolocation failed:', capError);
      console.log('[ReportIncident] 🧩 Trying browser fallback...');
    }

    // ✅ Browser fallback using navigator.geolocation
    if ('geolocation' in navigator) {
      const browserPosition = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      this.location = {
        lat: browserPosition.coords.latitude,
        lng: browserPosition.coords.longitude,
      };
      console.log('[ReportIncident] ✅ Got location via Browser API:', this.location);
      this.checkingLocation = false;
      return true;
    } else {
      throw new Error('Browser geolocation not supported');
    }
  } catch (err) {
    console.error('[ReportIncident] ❌ Could not get location:', err);
    this.error =
      'Unable to fetch your location. Please enable GPS, allow permissions, or use a supported device.';
    this.checkingLocation = false;
    return false;
  }
}


  /** Load nearby incidents */
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
      console.log('[ReportIncident] Loading nearby incidents...');
      const res: any = await this.http
        .get(`${environment.api_url}api/incidents/nearby?lat=${lat}&lng=${lng}`)
        .toPromise();

      this.nearbyIncidents = res || [];
      console.log('[ReportIncident] Found nearby incidents:', this.nearbyIncidents.length);

      if (this.nearbyIncidents.length === 0) {
        this.message = 'No nearby incidents found. You can create a new one below.';
      }
    } catch (err) {
      console.error('[ReportIncident] Error loading nearby incidents', err);
      this.error = 'Error loading nearby incidents.';
    } finally {
      this.loadingIncidents = false;
    }
  }

  /** Select or deselect an existing incident */
  toggleIncidentSelection(incidentId: string) {
    this.selectedIncidentId = this.selectedIncidentId === incidentId ? null : incidentId;
    console.log('[ReportIncident] Selected incident ID:', this.selectedIncidentId);
  }

  /** Submit a new or existing incident */
  async submitIncident() {
    console.log('[ReportIncident] Submitting incident...');

    if (this.incidentForm.invalid && !this.selectedIncidentId) {
      this.error = 'Please provide a valid description.';
      return;
    }

    // Get current user from AuthService
    const user = this.auth.getUser();
    const bystanderId = user?.bystanderId;

    if (!bystanderId) {
      console.error('[ReportIncident] Missing bystanderId. User not authenticated.');
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
        // Add media to existing incident
        const payload = {
          bystanderId,
          photos: this.photoUrls,
          videoUrl: this.videoUrl,
          description: this.incidentForm.value.description || '',
        };
        console.log('[ReportIncident] Updating existing incident:', payload);

        await this.http
          .put(`${environment.api_url}api/incidents/${this.selectedIncidentId}/media`, payload)
          .toPromise();

        this.message = 'Successfully added to existing incident.';
        this.router.navigate(['/incident-status', this.selectedIncidentId]);
      } else {
        // Create a new incident
        const payload = {
          description: this.incidentForm.value.description,
          photos: this.photoUrls,
          videoUrl: this.videoUrl,
          lat: this.location.lat,
          lng: this.location.lng,
          bystanderId,
          severity: this.incidentForm.value.severity,
          numberOfCasualties: this.incidentForm.value.numberOfCasualties,
        };
        console.log('[ReportIncident] Creating new incident:', payload);

        const res: any = await this.http
          .post(`${environment.api_url}api/incidents`, payload)
          .toPromise();

        this.message = 'New incident reported successfully.';
        const newId = res?.incident?._id || res?.incident?.id;
        if (newId) {
          this.router.navigate(['/incident-status', newId]);
        }
      }

      // Reset state after success
      this.incidentForm.reset({ severity: 5, numberOfCasualties: 1 });
      this.photoUrls = [];
      this.videoUrl = null;
      this.selectedIncidentId = null;

      await this.loadNearbyIncidents();
    } catch (err) {
      console.error('[ReportIncident] Error submitting incident:', err);
      this.error = 'Error submitting incident. Please try again.';
    } finally {
      this.submitting = false;
    }
  }

  /** View photo or incident details */
  openPhoto(photoUrl: string) {
    console.log('[ReportIncident] Opening photo:', photoUrl);
    window.open(photoUrl, '_blank');
  }

  openIncident(incidentId: string) {
    console.log('[ReportIncident] Opening incident detail page:', incidentId);
    this.router.navigate([`/incident-status`, incidentId]);
  }
}
