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

  /** Start WebRTC Capture */
async startLiveStream() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  this.previewRef.nativeElement.srcObject = stream;

  const mimeType = 'video/webm;codecs=vp8,opus';
  this.mediaRecorder = new MediaRecorder(stream, { mimeType });

  const key = this.streamKey || this.incident?._id || 'test123';
  const ws = new WebSocket(`${environment.api_url.replace('http', 'ws')}ws/live?key=${encodeURIComponent(key)}`);
  ws.binaryType = 'arraybuffer';

  ws.onopen = () => {
    this.mediaRecorder.ondataavailable = async (e) => {
      if (e.data && e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
        const buf = await e.data.arrayBuffer();
        ws.send(buf);
      }
    };
    this.mediaRecorder.start(250);
  };
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
