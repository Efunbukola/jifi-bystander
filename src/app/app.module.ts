import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage-angular';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { GoogleMapsModule } from '@angular/google-maps';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { ContainerComponent } from './components/container/container.component';
import { AlertComponent } from './components/alert/alert.component';
import { ModalComponent } from './components/modal/modal.component';
import { FileUploaderComponent } from './components/file-uploader/file-uploader.component';
import { MainBluetoothPageComponent } from './pages/main-bluetooth-page/main-bluetooth-page.component';
import { ReportIncidentComponent } from './pages/report-incident/report-incident.component';
import { IncidentStatusComponent } from './pages/incident-status/incident-status.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { DonationPageComponent } from './pages/donation-page/donation-page.component';
import { StripeDonationComponent } from './pages/stripe-donation/stripe-donation.component';
import { IncidentDonateComponent } from './pages/incident-donate/incident-donate.component';
import { LoginComponent } from './pages/login/login.component'; 
import { SignupComponent } from './pages/signup/signup.component'; 

import { AlertService } from './services/alert.service';
import { ModalService } from './services/modal.service';
import { SearchPipe } from './pipes/search.pipe';
import { SearchIPPipe } from './pipes/searchip.pipe';

import { AuthInterceptor } from './interceptors/auth.interceptor';
import { AuthService } from './services/auth.service';
import { AuthGuard } from './gaurds/auth.guard';
import { UnauthGuard } from './gaurds/unauth.guard';
import { BystanderProfileComponent } from './pages/bystander-profile/bystander-profile.component';
import { VideoUploaderComponent } from './components/video-uploader/video-uploader.component';
import { DonationMeterComponent } from './components/donation-meter/donation-meter.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';

@NgModule({
  declarations: [
    AppComponent,
    ContainerComponent,
    AlertComponent,
    ModalComponent,
    MainBluetoothPageComponent,
    FileUploaderComponent,
    ReportIncidentComponent,
    IncidentStatusComponent,
    DashboardComponent,
    StripeDonationComponent,
    IncidentDonateComponent,
    DonationPageComponent,
    LoginComponent, 
    SignupComponent, 
    BystanderProfileComponent,
    VideoUploaderComponent,
    DonationMeterComponent,
    ResetPasswordComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    IonicModule.forRoot({ mode: 'md', scrollAssist: false }),
    IonicStorageModule.forRoot(),
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    HttpClientModule,
    GoogleMapsModule,
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }, // 🧩 Auth Interceptor
    AlertService,
    ModalService,
    SearchPipe,
    SearchIPPipe,
    AuthService,
    AuthGuard,
    UnauthGuard
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
