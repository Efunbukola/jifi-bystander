import { Component, Injectable, OnInit } from '@angular/core';
import { NavigationEnd, NavigationError, NavigationSkipped, NavigationStart, Router } from '@angular/router';
import { initFlowbite } from 'flowbite';
import { RouteNames } from './route-names';
import { AlertType } from './components/alert/alert.component';
import { AlertService } from './services/alert.service';
import { Subject } from 'rxjs';
import { ModalService } from './services/modal.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit{

  
  config:{text:string, type:AlertType,showCheckIcon:boolean, time:number, show:boolean}
  = {text:'',type:AlertType.info,showCheckIcon:false, time:1000, show:false}

  ngOnInit(): void {
    initFlowbite();
  }
  
  constructor
  (public router: Router,
    public modalService:ModalService,
    public alertService:AlertService,) {

      alertService.show$.subscribe(config=>{
        this.config = config;
      })

    this.router.events.subscribe((event) => {

      //console.log(event);

      if (event instanceof NavigationStart) {


      }
      if (event instanceof NavigationEnd) {
        
        //console.log('URL is',event.url);
     
      }
      if (event instanceof NavigationSkipped) {
      }
      if (event instanceof NavigationError) {
       
        //console.log(event);

      }
    });

  }
}

@Injectable({ providedIn: 'root' })
export class UtilitiesService {
   documentClickedTarget: Subject<HTMLElement> = new Subject<HTMLElement>()
}
