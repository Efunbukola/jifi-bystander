import { AfterViewInit, Component, ElementRef, HostListener, Input, ViewChild } from '@angular/core';
import { autoUpdate, computePosition, offset, Placement, flip, shift } from '@floating-ui/dom';
import { UtilitiesService } from 'src/app/app.component';

@Component({
  selector: 'app-dropdown',
  templateUrl: './dropdown.component.html',
  styleUrls: ['./dropdown.component.scss'],
  standalone:false
})
export class DropdownComponent implements AfterViewInit {

  public isOpen = false;
  @Input() position: Placement = "bottom-start";
  @Input() useHover: boolean = false;
  @ViewChild('dropdown') dropdown!: ElementRef;
  @ViewChild('button') button!: ElementRef;
  x = 0;
  y = 0;
  width = 0;

  public toggle() {

      this.isOpen = !this.isOpen;

      this.calculatePosition().then(()=>{

        if(this.isOpen){

            setTimeout(()=>{
                this.dropdown.nativeElement.style.opacity = 100;
                this.dropdown.nativeElement.style.translateX = '0px';
            },100)
            this.dropdown.nativeElement.style.opacity = 0;
            this.dropdown.nativeElement.style.translateX = '-100px';
          }

      })
 
  }

  calculatePosition() {

    return new Promise<void>((resolve, reject) => {

      computePosition(this.button.nativeElement, this.dropdown.nativeElement,
          {
              placement: this.position,
              middleware: [offset(8), flip(), shift()]
          }
      ).then(({ x, y }: { x: number, y: number }) => {
          this.dropdown.nativeElement.style.left = x + 'px';
          this.dropdown.nativeElement.style.top = y + 'px';
          this.width = this.button.nativeElement.offsetWidth;
          resolve();
      });
    });

  }

  ngAfterViewInit() {
      autoUpdate(this.button.nativeElement, this.dropdown.nativeElement, () => {
          if(!this.isOpen) return;
          this.calculatePosition();
      });
      this.utilitiesService.documentClickedTarget
           .subscribe(target => this.documentClickListener(target))
  }

  constructor(private utilitiesService: UtilitiesService) { }

  // Onclick outside the dropdown, close it
  documentClickListener(target: any): void {
      if (!this.dropdown.nativeElement.contains(target) && this.isOpen && !this.button.nativeElement.contains(target)) {
          this.isOpen = false;
      }
  }

  hideOnHover(){

    if(this.useHover){
      
      
      this.isOpen = false;

      this.calculatePosition().then(()=>{

        if(this.isOpen){

            setTimeout(()=>{
                this.dropdown.nativeElement.style.opacity = 100;
                this.dropdown.nativeElement.style.translateX = '0px';
            },100)
            this.dropdown.nativeElement.style.opacity = 0;
            this.dropdown.nativeElement.style.translateX = '-100px';
          }

      })

    }


  }

  showOnHover(){

    if(this.useHover){
      
      this.isOpen = true;

      this.calculatePosition().then(()=>{

        if(this.isOpen){

            setTimeout(()=>{
                this.dropdown.nativeElement.style.opacity = 100;
                this.dropdown.nativeElement.style.translateX = '0px';
            },100)
            this.dropdown.nativeElement.style.opacity = 0;
            this.dropdown.nativeElement.style.translateX = '-100px';
          }

      })

    }


  }


}
