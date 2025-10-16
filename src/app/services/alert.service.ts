import { Injectable } from '@angular/core';
import { AlertType } from '../components/alert/alert.component';
import { Subject, BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  private showAlert$:Subject<{text:string, type:AlertType,showCheckIcon:boolean, time:number, show:boolean, done?:()=>void}>
  = new BehaviorSubject<{text:string, type:AlertType,showCheckIcon:boolean, time:number, show:boolean, done?:()=>void}>({text:'',type:AlertType.info,showCheckIcon:false, time:3000, show:false});
  
  show$:Observable<{text:string, type:AlertType,showCheckIcon:boolean, time:number, show:boolean, done?:()=>void}>
  = this.showAlert$ as Observable<{text:string, type:AlertType,showCheckIcon:boolean, time:number, show:boolean, done?:()=>void}>;

  constructor() { }

  show(config:{text:string, type:AlertType,showCheckIcon:boolean, time:number, done?:()=>void}){
    this.showAlert$.next({...config, show:true});
    setTimeout(()=>{
      this.showAlert$.next({...config, show:false});
      if(config.done)config.done();
    },config.time)
  }

}
