import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ModalService {

  private modalState$:Subject<boolean> = new BehaviorSubject<boolean>(false);
  open$:Observable<boolean> = this.modalState$ as Observable<boolean>;
  isDismissable = true;

  constructor() { }

  public openModal(isDismissable:boolean=true){
    this.isDismissable = isDismissable;
    this.modalState$.next(true);
  }

  public clickedOutsideModal(){
    if(this.isDismissable){
    this.modalState$.next(false);
    }
  }

  public closeModal(){
    this.modalState$.next(false);
  }

}
