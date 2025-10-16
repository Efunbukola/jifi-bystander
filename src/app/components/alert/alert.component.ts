import { Component, Input } from '@angular/core';

export enum AlertType {
  info=1, 
  danger=2,
  success=3,
  warning=4,
  generic=5
}

@Component({
  selector: 'app-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss'],
  standalone:false
})
export class AlertComponent {

  @Input() alertType: AlertType = AlertType.generic;
  @Input() showInfoIcon: boolean = false;
  @Input() showCheckIcon: boolean = false;

  public get AlertType() {
    return AlertType; 
  }

}
