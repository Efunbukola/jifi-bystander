import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { io, Socket } from 'socket.io-client';
import { GoogleMap } from '@angular/google-maps';
import { AuthService } from '../../services/auth.service'; // ✅ Import AuthService

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

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private auth: AuthService // ✅ Inject AuthService
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    const user = this.auth.getUser(); // ✅ Get current user
    const bystanderId = user?.bystanderId;

    if (!id) {
      this.error = 'Invalid incident ID';
      return;
    }

    if (!bystanderId) {
      console.error('[IncidentStatus] Missing bystanderId — user not authenticated.');
      this.error = 'You must be logged in to view incident status.';
      this.loading = false;
      return;
    }

    try {
      console.log('[IncidentStatus] Connecting to socket with bystanderId:', bystanderId);
      this.socket = io(environment.api_url, { transports: ['websocket'] });

      // 1️⃣ Join the room for this incident
      this.socket.emit('watchIncident', { incidentId: id, bystanderId });
      console.log('[IncidentStatus] Watching incident:', id);

      // 2️⃣ Get initial snapshot
      this.socket.on('incidentSnapshot', (data) => {
        console.log('[IncidentStatus] 📡 Snapshot received:', data);
        this.incident = data;
        this.responders = data.responders || [];
        this.updateMapMarkers();
        this.loading = false;
      });

      // 3️⃣ A new responder joins
      this.socket.on('responderJoined', (data) => {
        if (!this.incident || data.incidentId !== this.incident._id) return;

        console.log('[IncidentStatus] 🚑 New responder joined:', data.responder);
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
        if (!this.incident || data.incidentId !== this.incident._id) return;

        console.log('[IncidentStatus] 📍 Responder location update:', data);
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

      // 5️⃣ Handle incident closed
      this.socket.on('incidentClosed', (data) => {
        if (this.incident && data.incidentId === this.incident._id) {
          console.log('[IncidentStatus] 🚨 Incident closed:', data);
          this.incident.status = 'closed';
        }
      });

      // 6️⃣ Handle disconnects
      this.socket.on('disconnect', () => {
        console.warn('[IncidentStatus] Socket disconnected.');
      });
    } catch (err) {
      console.error('[IncidentStatus] Error connecting to socket:', err);
      this.error = 'Unable to connect to live updates.';
      this.loading = false;
    }
  }

  ngOnDestroy() {
    if (this.socket) {
      console.log('[IncidentStatus] Disconnecting socket...');
      this.socket.disconnect();
    }
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
          label: {
            text: `🚑 ${r.name || 'Responder'}`,
            className: 'text-green-700',
          },
        });
      }
    }

    this.markers = markers;
    console.log('[IncidentStatus] 🗺️ Map markers updated:', this.markers);
  }

  openPhoto(photoUrl: string) {
    console.log('[IncidentStatus] Opening photo:', photoUrl);
    window.open(photoUrl, '_blank');
  }
}
