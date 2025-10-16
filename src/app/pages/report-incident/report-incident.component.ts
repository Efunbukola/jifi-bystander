import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FileUploaderComponent } from '../../components/file-uploader/file-uploader.component';
import { Geolocation } from '@capacitor/geolocation';


@Component({
  selector: 'app-report-incident',
  templateUrl: './report-incident.component.html',
  styleUrls: ['./report-incident.component.scss'],
  standalone:false
})
export class ReportIncidentComponent {
  incidentForm: FormGroup;
  photoUrls: string[] = [];
  submitting = false;
  message = '';
  error = '';
  location: { lat: number; lng: number } | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient) {
    this.incidentForm = this.fb.group({
      description: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  onImageUploaded(event: { url: string; file_name: string }) {
    this.photoUrls.push(event.url);
  }

  onUploadError() {
    this.error = 'Error uploading one or more images.';
  }

  removePhoto(url: string) {
    this.photoUrls = this.photoUrls.filter(p => p !== url);
  }

  async fetchLocation() {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true
      });

      this.location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      console.log('[GPS] Location fetched:', this.location);
    } catch (err) {
      console.warn('⚠️ Could not get location:', err);
      this.error = 'Unable to fetch your location. Please enable GPS.';
    }
  }

  async submitIncident() {
    if (this.incidentForm.invalid) {
      this.error = 'Please provide a valid description.';
      return;
    }

    const bystanderId = '5c21396c-cf5f-41c4-845b-6a76b258217b'//this.auth.getBystanderId();
    if (!bystanderId) {
      this.error = 'You must be logged in to submit a report.';
      return;
    }

    
  if (!this.location) {
      await this.fetchLocation();
      if (!this.location) {
        this.error = 'Location not available. Please enable GPS.';
        return;
      }
    }

    const payload = {
      description: this.incidentForm.value.description,
      photos: this.photoUrls,
      videoUrl: null,
      lat: this.location.lat,
      lng: this.location.lng,
      bystanderId,
    };


    this.submitting = true;
    this.http.post(`${environment.api_url}api/incidents`, payload)
      .subscribe({
        next: (res) => {
          this.submitting = false;
          this.incidentForm.reset();
          this.photoUrls = [];
          this.message = 'Incident reported successfully!';
          this.error = '';
        },
        error: (err) => {
          this.submitting = false;
          this.error = 'Error submitting incident. Try again.';
          console.error(err);
        }
      });
  }
}
