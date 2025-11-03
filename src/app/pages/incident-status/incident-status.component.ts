import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { io, Socket } from 'socket.io-client';
import { GoogleMap } from '@angular/google-maps';
import { AuthService } from '../../services/auth.service';

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

  // Google Maps
  center: google.maps.LatLngLiteral = { lat: 0, lng: 0 };
  zoom = 14;
  markers: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private auth: AuthService
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    const user = this.auth.getUser();
    const bystanderId = user?.bystanderId;

    if (!id) {
      this.error = 'Invalid incident ID';
      return;
    }

    if (!bystanderId) {
      this.error = 'You must be logged in to view incident status.';
      this.loading = false;
      return;
    }

    try {
      this.socket = io(environment.api_url, { transports: ['websocket'] });
      this.socket.emit('watchIncident', { incidentId: id, bystanderId });

      // 1️⃣ Initial snapshot
      this.socket.on('incidentSnapshot', (data) => {
        console.log('[IncidentStatus] Snapshot received:', data);
        this.incident = data.incident;
        this.responders = data.responders || [];

        // Merge ETA info from incident.responderEtas
        if (this.incident?.responderEtas?.length) {
          this.responders = this.responders.map((r) => {
            const eta = this.incident.responderEtas.find(
              (e: any) => e.responderId === r.responderId
            );
            return { ...r, eta };
          });
        }

        this.updateMapMarkers();
        this.loading = false;
      });

      // 2️⃣ New responder joined
      this.socket.on('responderJoined', (data) => {
        if (!this.incident || data.incidentId !== this.incident._id) return;

        console.log('[IncidentStatus] 🚑 Responder joined:', data);
        const existing = this.responders.find(
          (r) => r.responderId === data.responder.responderId
        );

        if (existing) {
          existing.location = data.responder.location;
          existing.eta = data.responder.eta;
        } else {
          this.responders.push({
            ...data.responder,
            eta: data.responder.eta,
          });
        }

        this.incident.responderCount = data.responderCount;
        this.incident.status = data.status;
        this.updateMapMarkers();
      });

      // 3️⃣ Location updates
      this.socket.on('responderLocationUpdate', (data) => {
        if (!this.incident || data.incidentId !== this.incident._id) return;
        const existing = this.responders.find(
          (r) => r.responderId === data.responderId
        );
        if (existing) {
          existing.location = data.location;
        }
        this.updateMapMarkers();
      });

      // 4️⃣ ETA updates (if backend sends updated ETA later)
      this.socket.on('responderEtaUpdate', (data) => {
        console.log('[IncidentStatus] ⏱️ ETA update received:', data);
        const responder = this.responders.find(
          (r) => r.responderId === data.responderId
        );
        if (responder) {
          responder.eta = {
            etaText: data.etaText,
            method: data.method,
          };
        }
      });

      // 5️⃣ Handle incident closed
      this.socket.on('incidentClosed', (data) => {
        if (this.incident && data.incidentId === this.incident._id) {
          this.incident.status = 'closed';
        }
      });
    } catch (err) {
      console.error('[IncidentStatus] Error connecting:', err);
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

    const markers: any[] = [
      {
        position: { lat, lng },
        label: { text: '📍 Incident', className: 'font-bold text-red-700' },
      },
    ];

    for (const r of this.responders) {
      if (r.location?.coordinates) {
        const [rlng, rlat] = r.location.coordinates;
        const etaLabel = r.eta?.etaText ? ` (${r.eta.etaText})` : '';
        markers.push({
          position: { lat: rlat, lng: rlng },
          label: {
            text: `🚑 ${r.name || 'Responder'}${etaLabel}`,
            className: 'text-green-700',
          },
        });
      }
    }

    this.markers = markers;
  }

  openPhoto(photoUrl: string) {
    window.open(photoUrl, '_blank');
  }
}
