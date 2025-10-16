import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AlertType } from '../alert/alert.component';

@Component({
  selector: 'app-file-uploader',
  templateUrl: './file-uploader.component.html',
  styleUrls: ['./file-uploader.component.scss'],
  standalone:false
})
export class FileUploaderComponent {

  @Input() button_title: string = "Upload your image";
  @Input() allowed_file_types: string[] = ['png', 'image/jpeg'];
  @Output() uploadSuccessfulEvent = new EventEmitter<{url:any, file_name:any}>();
  @Output() uploadErrorEvent = new EventEmitter<{error: any}>();


  uploadingImage = false;
  errorUploadingImage = false;
  errorUploadingImageWrongType = false;
  imageURL = '';

  constructor(
    private http: HttpClient
  ){

  }

  onImageFileChange(event:any){

    console.log(event);

      let fileList = event.target.files;

      this.uploadingImage = true;
      this.errorUploadingImage = false;
      this.errorUploadingImageWrongType = false;

      if(fileList.length > 0) {

          let timeStamp  = new Date().getTime();

          let file: File = fileList[0];
          const file_name = `abstract-${timeStamp}`
          let formData:FormData = new FormData();
          formData.append('file', file, file.name);
          formData.append('public_id', `abstract-${timeStamp}`);
          formData.append('upload_preset', 'ml_default');
          formData.append("asset_folder", "iixi_abstracts");
          
          console.log(fileList);

          console.log(file.type);
          console.log(this.allowed_file_types);
          console.log(this.allowed_file_types.includes(file.type));

          if(this.ValidateSize(file) && (this.allowed_file_types.filter( aft => aft.includes(file.type)))){

            this.uploadToCloudinary(formData)
            .subscribe({
              next:(data:any)=>{

                this.uploadingImage = false;
                this.errorUploadingImage = false;
                event.target.value = null;

                console.log('Uploaded', data);

                this.imageURL=data.secure_url;

                this.uploadSuccessfulEvent.emit({url:data.secure_url, file_name:file_name});

              },
              error:(e:any)=>{

                this.uploadingImage = false;
                this.errorUploadingImageWrongType = true;
                event.target.value = null;

                this.uploadErrorEvent.emit();
                
              }
            });

          }else{

            event.target.value = null;
            this.uploadingImage = false;
            this.errorUploadingImageWrongType = true;
            this.errorUploadingImage = true;

            this.uploadErrorEvent.emit();

          }
      }

  }

  ValidateSize(file:any) {
    var FileSize = file.size / 1024 / 1024; // in MB
    if (FileSize > 5) {
        alert('File size exceeds 5 MB');
    }
    return FileSize < 5;
  }

  uploadToCloudinary(formData:any){
    return this.http.post(`https://api.cloudinary.com/v1_1/dwnxkdm1j/upload`,
    formData)
   }

   public get AlertType() {
    return AlertType; 
  }

  getAllowedFileTypeList(){
    return this.allowed_file_types.map(m=>'.'+m).toString()
  }

}
