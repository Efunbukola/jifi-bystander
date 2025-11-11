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

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private auth: AuthService
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'Invalid incident ID';
      return;
    }

    // Fetch the incident to get its stream key / playback URL
    try {
      const res: any = await this.http
        .get(`${environment.api_url}api/incidents/${id}`)
        .toPromise();

      this.incident = res;
      this.livePlaybackUrl = res.liveStreamUrl;
      this.streamKey = res.streamKey || null; // optional if stored


       // ✅ Update Google Map
    if (res.location && res.location.coordinates?.length === 2) {
      const [lng, lat] = res.location.coordinates;

      this.center = { lat, lng };
      this.zoom = 16;
      this.markers = [
        {
          position: { lat, lng },
          label: {
            text: '🚨 Incident',
            color: 'red',
            fontWeight: 'bold'
          }
        }
      ];
    }

      this.loading = false;


    } catch (err) {
      console.error('Error loading incident:', err);
      this.error = 'Unable to load incident data.';
      this.loading = false;
    }
  }

  ngOnDestroy() {
    if (this.socket) this.socket.disconnect();
    this.stopLiveStream();
  }

async startLiveStream() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    const video = this.previewRef.nativeElement;
    video.srcObject = stream;
    video.muted = true;
    video.play();

    const mimeType = 'video/webm;codecs=vp8,opus';
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
}
