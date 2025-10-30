import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-donation-meter',
  templateUrl: './donation-meter.component.html',
  styleUrls: ['./donation-meter.component.scss'],
  standalone:false
})
export class DonationMeterComponent implements OnInit {
  @Input() goal: number = 100;
  @Input() raised: number = 0;

  percent = 0;

  ngOnInit() {
    setTimeout(() => {
      this.percent = this.getDonationPercent();
    }, 100);
  }

  getDonationPercent(): number {
    if (!this.goal || this.goal === 0) return 0;
    return Math.min(100, Math.round((this.raised / this.goal) * 100));
  }

  getRemaining(): number {
    return Math.max(0, this.goal - this.raised);
  }
}
