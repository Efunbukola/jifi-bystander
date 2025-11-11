import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AlertType } from '../alert/alert.component';
import { FilesetResolver, FaceDetector } from '@mediapipe/tasks-vision';

@Component({
  selector: 'app-file-uploader',
  templateUrl: './file-uploader.component.html',
  styleUrls: ['./file-uploader.component.scss'],
  standalone: false,
})
export class FileUploaderComponent {
  @Input() button_title: string = 'Upload your image';
  @Input() allowed_file_types: string[] = ['png', 'image/jpeg'];
  @Output() uploadSuccessfulEvent = new EventEmitter<{ url: any; file_name: any }>();
  @Output() uploadErrorEvent = new EventEmitter<{ error: any }>();

  uploadingImage = false;
  errorUploadingImage = false;
  errorUploadingImageWrongType = false;
  imageURL = '';
  blurredPreviewUrl: string | null = null;
  showPreview = false;

  private faceDetector!: FaceDetector;
  private detectorReady = false;

  constructor(private http: HttpClient) {}

  async ngOnInit() {
    console.log('Loading local BlazeFace model & WASM...');

    // Load local WASM runtime from node_modules
    const wasmPath = '/assets/wasm';
    const vision = await FilesetResolver.forVisionTasks(wasmPath);

    // Load local BlazeFace model (in /assets/models/)
    this.faceDetector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: '/assets/blaze_face_short_range.tflite',
      },
      runningMode: 'IMAGE',
    });

    this.detectorReady = true;
    console.log('FaceDetector ready (local model + local wasm)');
  }

  async onImageFileChange(event: any) {
    const fileList = event.target.files;
    if (!fileList.length) return;

    this.uploadingImage = true;
    this.errorUploadingImage = false;
    this.errorUploadingImageWrongType = false;

    const file: File = fileList[0];
    const isAllowedType = this.allowed_file_types.some((t) => file.type.includes(t));

    if (!isAllowedType || !this.ValidateSize(file)) {
      this.uploadingImage = false;
      this.errorUploadingImageWrongType = true;
      this.uploadErrorEvent.emit({ error: 'Invalid file' });
      return;
    }

    try {
      // Step 1: Blur faces before upload
      const { blurredFile, previewUrl } = await this.blurFacesInImage(file);

      // show preview
      this.blurredPreviewUrl = previewUrl;
      this.showPreview = true;

      // Step 2: Upload blurred image
      const timeStamp = new Date().getTime();
      const file_name = `abstract-${timeStamp}`;
      const formData: FormData = new FormData();
      formData.append('file', blurredFile, file_name + '.jpg');
      formData.append('public_id', file_name);
      formData.append('upload_preset', 'ml_default');
      formData.append('asset_folder', 'jifi_photos');

      this.uploadToCloudinary(formData).subscribe({
        next: (data: any) => {
          this.uploadingImage = false;
          this.errorUploadingImage = false;
          this.imageURL = data.secure_url;
          this.uploadSuccessfulEvent.emit({ url: data.secure_url, file_name });
        },
        error: (e: any) => {
          console.error('Upload failed:', e);
          this.uploadingImage = false;
          this.errorUploadingImage = true;
          this.uploadErrorEvent.emit({ error: e });
        },
      });
    } catch (err: any) {
      console.error('Blur/Upload error:', err);
      this.uploadingImage = false;
      this.errorUploadingImage = true;
      this.uploadErrorEvent.emit({ error: err });
    }
  }

  /** ✅ Uses MediaPipe to detect and blur faces before upload */
  private async blurFacesInImage(file: File): Promise<{ blurredFile: File; previewUrl: string }> {
    if (!this.detectorReady) throw new Error('Face detector not ready yet');

    const img = new Image();
    const imgURL = URL.createObjectURL(file);
    img.src = imgURL;
    await img.decode();

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    const detections = this.faceDetector.detect(img).detections || [];
    console.log(`Detected ${detections.length} face(s)`);

    for (const d of detections) {
      const box = d.boundingBox;
      if (!box) continue;
      const { originX = 0, originY = 0, width = 0, height = 0 } = box;

      const faceCanvas = document.createElement('canvas');
      faceCanvas.width = width;
      faceCanvas.height = height;

      const faceCtx = faceCanvas.getContext('2d')!;
      faceCtx.drawImage(canvas, originX, originY, width, height, 0, 0, width, height);
      faceCtx.filter = 'blur(12px)';
      faceCtx.drawImage(faceCanvas, 0, 0);
      ctx.drawImage(faceCanvas, originX, originY);
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) throw new Error('Failed to generate blurred blob');
        const blurredFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '-blurred.jpg', {
          type: 'image/jpeg',
        });
        const previewUrl = URL.createObjectURL(blob);
        resolve({ blurredFile, previewUrl });
      }, 'image/jpeg', 0.9);
    });
  }

  ValidateSize(file: File) {
    const FileSize = file.size / 1024 / 1024;
    if (FileSize > 5) alert('File size exceeds 5 MB');
    return FileSize < 5;
  }

  uploadToCloudinary(formData: FormData) {
    return this.http.post(`https://api.cloudinary.com/v1_1/dwnxkdm1j/upload`, formData);
  }

  public get AlertType() {
    return AlertType;
  }

  getAllowedFileTypeList() {
    return this.allowed_file_types.map((m) => '.' + m).toString();
  }
}
