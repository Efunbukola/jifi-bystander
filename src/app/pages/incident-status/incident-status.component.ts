import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
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
  standalone:false
})
export class IncidentStatusComponent implements OnInit, OnDestroy {
  @ViewChild('preview') previewRef!: ElementRef<HTMLVideoElement>;
  @ViewChild(GoogleMap) map!: GoogleMap;

  socket!: Socket;
  incident: any = null;
  responders: any[] = [];
  loading = true;
  error = '';
  streaming = false;
  mediaRecorder!: MediaRecorder;
  livePlaybackUrl: string | null = null;
  streamKey: string | null = null;

  // Map config
  center: google.maps.LatLngLiteral = { lat: 0, lng: 0 };
  zoom = 14;
  markers: any[] = [];

  // Survey modals
  showBystanderSurvey = false;
  showInjuredSurvey = false;

  // Survey form models
  bystanderSurvey = {
    performance_rating: null,
    comments: ''
  };

  injuredSurvey = {
    first_name: '',
    last_name: '',
    performance_rating: null,
    comments: ''
  };

  surveySubmitting = false;
  surveySuccess = '';
  surveyError = '';

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

      const res: any = await this.http
        .get(`${environment.api_url}api/incidents/${id}`)
        .toPromise();

      this.livePlaybackUrl = res.liveStreamUrl;
      this.streamKey = res.streamKey || null; // optional if stored

      this.socket = io(environment.api_url, { transports: ['websocket'] });
      this.socket.emit('watchIncident', { incidentId: id, bystanderId });

      // 1️Initial snapshot
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


async startLiveStream() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    const video = this.previewRef.nativeElement;
    video.srcObject = stream;
    video.muted = true;
    video.play();

    let mimeType = '';
    if (MediaRecorder.isTypeSupported('video/webm;codecs=h264,opus')) {
      mimeType = 'video/webm;codecs=h264,opus';
    } else if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264,aac')) {
      mimeType = 'video/mp4;codecs=h264,aac';
    } else {
      mimeType = 'video/webm;codecs=vp8,opus'; // fallback
    }
    
    this.mediaRecorder = new MediaRecorder(stream, { mimeType });

        // ✅ Use a consistent key derived from the incident itself
    const incidentId = this.incident?._id || 'test123';
    const safeKey = `incident_${incidentId}`; // stable per incident
    const wsUrl = `${environment.api_url.replace(/^http/, 'ws')}ws/live?key=${encodeURIComponent(safeKey)}`;
    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      console.log('WebSocket connected');
      this.mediaRecorder.ondataavailable = async e => {
        if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(await e.data.arrayBuffer());
        }
      };
      this.mediaRecorder.start(250);
      this.streaming = true;
    };

    ws.onerror = err => console.error('WS error', err);
    ws.onclose = () => {
      console.log('WS closed');
      this.stopLiveStream();
    };

  } catch (err) {
    console.error('Stream start error', err);
    this.error = 'Could not start camera/mic.';
  }
}



  /** Stop Streaming */
  stopLiveStream() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    const video = this.previewRef.nativeElement;
    const stream = video.srcObject as MediaStream;
    stream?.getTracks().forEach((t) => t.stop());
    this.streaming = false;
  }

  /** Submit bystander survey */
async submitBystanderSurvey() {
  if (!this.incident?._id) return;

  this.surveySubmitting = true;
  this.surveySuccess = '';
  this.surveyError = '';

  try {
    await this.http.post(
      `${environment.api_url}api/bystanders/${this.incident._id}/bystander-survey`,
      this.bystanderSurvey,
    ).toPromise();

    this.surveySuccess = "Thank you! Your feedback was submitted.";
    this.showBystanderSurvey = false;
  } catch (err: any) {
    this.surveyError = err?.error?.error || "Survey submission failed.";
  }

  this.surveySubmitting = false;
}

async submitInjuredSurvey() {
  if (!this.incident?._id) return;

  this.surveySubmitting = true;
  this.surveySuccess = '';
  this.surveyError = '';

  try {
    await this.http.post(
      `${environment.api_url}api/bystanders/${this.incident._id}/injured-survey`,
      this.injuredSurvey
    ).toPromise();

    this.surveySuccess = "Thank you! Your feedback was submitted.";
    this.showInjuredSurvey = false;
  } catch (err: any) {
    this.surveyError = err?.error?.error || "Survey submission failed.";
  }

  this.surveySubmitting = false;
}

}
