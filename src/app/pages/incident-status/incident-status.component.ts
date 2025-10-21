import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { io, Socket } from 'socket.io-client';
import { GoogleMap } from '@angular/google-maps';

@Component({
  selector: 'app-incident-status',
  templateUrl: './incident-status.component.html',
  styleUrls: ['./incident-status.component.scss'],
  standalone: false,
})
export class IncidentStatusComponent implements OnInit, OnDestroy {
  @ViewChild(GoogleMap) map!: GoogleMap;
  socket!: Socket;
  incident: any = null;
  responders: any[] = [];
  loading = true;
  error = '';

  // Google Maps state
  center: google.maps.LatLngLiteral = { lat: 0, lng: 0 };
  zoom = 14;
  markers: any[] = [];

  constructor(private route: ActivatedRoute, private http: HttpClient) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    const bystanderId = '5c21396c-cf5f-41c4-845b-6a76b258217b'; // TODO: Replace with real auth

    if (!id) {
      this.error = 'Invalid incident ID';
      return;
    }

    try {
      // Initialize Socket.io
      this.socket = io(environment.api_url, { transports: ['websocket'] });

      // 1️⃣ Join the room for this incident
      this.socket.emit('watchIncident', { incidentId: id, bystanderId });

      // 2️⃣ Get initial snapshot when joining
      this.socket.on('incidentSnapshot', (data) => {
        console.log('📡 Snapshot received:', data);
        this.incident = data;
        this.responders = data.responders || [];
        this.updateMapMarkers();
        this.loading = false;
      });

      // 3️⃣ A new responder joins
      this.socket.on('responderJoined', (data) => {
        if (!this.incident || data.incidentId !== this.incident.incidentId && data.incidentId !== this.incident.incidentId?._id) return;

        console.log('🚑 New responder joined:', data.responder);
        const existing = this.responders.find(
          (r) => r.responderId === data.responder.responderId
        );
        if (!existing) this.responders.push(data.responder);

        this.incident.responderCount = data.responderCount;
        this.incident.status = data.status;
        this.updateMapMarkers();
      });

      // 4️⃣ Responder location updates
      this.socket.on('responderLocationUpdate', (data) => {
        if (!this.incident || data.incidentId !== this.incident.incidentId && data.incidentId !== this.incident.incidentId?._id) return;

        const existing = this.responders.find(
          (r) => r.responderId === data.responderId
        );
        if (existing) {
          existing.location = data.location;
        } else {
          this.responders.push({
            responderId: data.responderId,
            name: data.name,
            location: data.location,
          });
        }
        this.updateMapMarkers();
      });

      // 5️⃣ Handle incident closed (optional future)
      this.socket.on('incidentClosed', (data) => {
        if (this.incident && data.incidentId === this.incident.incidentId) {
          this.incident.status = 'closed';
        }
      });
    } catch (err) {
      console.error('Error connecting to socket:', err);
      this.error = 'Unable to connect to live updates.';
      this.loading = false;
    }
  }

  ngOnDestroy() {
    if (this.socket) this.socket.disconnect();
  }

  updateMapMarkers() {
    if (!this.incident) return;
    const [lng, lat] = this.incident?.location?.coordinates || [0, 0];
    this.center = { lat, lng };

    // 📍 Incident marker
    const markers: any[] = [
      {
        position: { lat, lng },
        label: { text: '📍 Incident', className: 'font-bold text-red-700' },
      },
    ];

    // 🚑 Responder markers
    for (const r of this.responders) {
      if (r.location?.coordinates) {
        const [rlng, rlat] = r.location.coordinates;
        markers.push({
          position: { lat: rlat, lng: rlng },
          label: { text: `🚑 ${r.name || 'Responder'}`, className: 'text-green-700' },
        });
      }
    }

    this.markers = markers;
  }

    openPhoto(photoUrl: string) {
    window.open(photoUrl, '_blank');
  }

}
