import { Component, HostListener, Input } from '@angular/core';
import { UtilitiesService } from 'src/app/app.component';
import { ModalService } from 'src/app/services/modal.service';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  standalone:false
})
export class ModalComponent {

  @HostListener('document:keydown.escape', ['$event']) onKeydownHandler(event: KeyboardEvent) {
    if(this.isDismissable){
      this.hide();
    }
}

 public showing = false;
 isDismissable = true;
 @Input() fullscreen: boolean = false;
 actionCallback=()=>{}
 dismissCallback=()=>{}
 data:any = {};
 
 constructor(public modalService:ModalService, public utilitiesService:UtilitiesService){}

 show(config:{onAction: () => any, onDismiss: ()=> any, isDismissable:boolean, data:any}){
  this.data=config.data;
  this.actionCallback=config.onAction;
  this.dismissCallback=config.onDismiss;
  this.modalService.openModal(config.isDismissable);
  this.isDismissable = config.isDismissable;
  this.showing=true;
  
 }

 action(){
  this.showing=false;
  this.modalService.closeModal();
  this.actionCallback();
 }

 hide(){
  this.showing=false;
  this.modalService.closeModal();
  this.dismissCallback();
 }

 clickedOutsideModal(event:any){
  
  this.trackClicks(event);
  
  if(this.isDismissable){
    this.showing=false;
    this.modalService.closeModal();
  }
 }

 trackClicks(event:any){
  this.utilitiesService.documentClickedTarget.next(event.target);
 }

}
