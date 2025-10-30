import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AlertType } from '../alert/alert.component';

@Component({
  selector: 'app-video-uploader',
  templateUrl: './video-uploader.component.html',
  styleUrls: ['./video-uploader.component.scss'],
  standalone: false,
})
export class VideoUploaderComponent {
  @Input() button_title: string = 'Upload your video';
  @Input() allowed_file_types: string[] = ['video/mp4', 'video/webm', 'video/quicktime'];
  @Output() uploadSuccessfulEvent = new EventEmitter<{ url: string; file_name: string }>();
  @Output() uploadErrorEvent = new EventEmitter<{ error: any }>();

  uploadingVideo = false;
  errorUploadingVideo = false;
  errorUploadingVideoWrongType = false;

  videoURL: string | null = null; // Cloudinary URL
  previewThumbnail: string | null = null; // Local preview (first frame)

  constructor(private http: HttpClient) {}

  /** Handle file selection */
  async onVideoFileChange(event: any) {
    console.log('[VideoUploader] File change detected:', event);

    const fileList = event.target.files;
    if (this.videoURL || this.uploadingVideo) {
      console.warn('[VideoUploader] A video is already uploaded or uploading. Only one allowed.');
      alert('Only one video can be uploaded. Please remove the current one first.');
      event.target.value = null;
      return;
    }

    this.errorUploadingVideo = false;
    this.errorUploadingVideoWrongType = false;

    if (fileList.length > 0) {
      const file: File = fileList[0];
      console.log('[VideoUploader] Selected file:', file.name, 'Type:', file.type, 'Size:', file.size, 'bytes');

      if (!this.validateSize(file)) {
        console.error('[VideoUploader] File rejected due to size > 100MB.');
        this.errorUploadingVideoWrongType = true;
        event.target.value = null;
        return;
      }

      if (!this.allowed_file_types.includes(file.type)) {
        console.error('[VideoUploader] Invalid file type:', file.type);
        alert('Invalid file type. Please upload an MP4, MOV, or WEBM video.');
        this.errorUploadingVideoWrongType = true;
        event.target.value = null;
        return;
      }

      try {
        console.log('[VideoUploader] Generating video thumbnail...');
        this.previewThumbnail = await this.generateThumbnail(file);
        console.log('[VideoUploader] Thumbnail generated successfully.');
      } catch (err) {
        console.error('[VideoUploader] Error generating thumbnail:', err);
      }

      const timeStamp = new Date().getTime();
      const file_name = `video-${timeStamp}`;
      const formData: FormData = new FormData();
      formData.append('file', file, file.name);
      formData.append('public_id', file_name);
      formData.append('upload_preset', 'ml_default');
      formData.append('asset_folder', 'jifi_videos');

      console.log('[VideoUploader] Preparing upload to Cloudinary...');
      this.uploadingVideo = true;

      this.uploadToCloudinary(formData).subscribe({
        next: (data: any) => {
          console.log('[VideoUploader] Upload successful:', data);
          this.uploadingVideo = false;
          this.videoURL = data.secure_url;
          this.uploadSuccessfulEvent.emit({ url: data.secure_url, file_name });
        },
        error: (e: any) => {
          console.error('[VideoUploader] Upload failed:', e);
          this.uploadingVideo = false;
          this.errorUploadingVideo = true;
          this.uploadErrorEvent.emit({ error: e });
        },
      });
    }
  }

  /** Extract first frame as thumbnail (returns base64 image) */
  async generateThumbnail(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.currentTime = 0.5;
      video.muted = true;
      video.playsInline = true;

      video.addEventListener('loadeddata', () => {
        console.log('[VideoUploader] Extracting first frame for thumbnail...');
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth / 2;
          canvas.height = video.videoHeight / 2;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
        } catch (err) {
          reject(err);
        } finally {
          URL.revokeObjectURL(video.src);
        }
      });

      video.onerror = (e) => {
        console.error('[VideoUploader] Error loading video for thumbnail generation:', e);
        reject(e);
      };
    });
  }

  /** Limit size to 100MB */
  validateSize(file: File): boolean {
    const sizeMB = file.size / 1024 / 1024;
    console.log('[VideoUploader] File size check:', sizeMB.toFixed(2), 'MB');
    if (sizeMB > 100) {
      alert('Video size exceeds 100MB limit.');
      return false;
    }
    return true;
  }

  /** Upload to Cloudinary */
  uploadToCloudinary(formData: FormData) {
    console.log('[VideoUploader] Starting upload to Cloudinary...');
    return this.http.post(`https://api.cloudinary.com/v1_1/dwnxkdm1j/upload`, formData);
  }

  /** Remove uploaded video */
  removeVideo() {
    console.log('[VideoUploader] Removing uploaded video and preview.');
    this.videoURL = null;
    this.previewThumbnail = null;
  }

  /** Helpers */
  get AlertType() {
    return AlertType;
  }

  getAllowedFileTypeList() {
    return this.allowed_file_types.map((m) => '.' + m.split('/')[1]).toString();
  }
}
