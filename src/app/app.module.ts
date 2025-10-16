import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy, RouterModule } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ContainerComponent } from './components/container/container.component';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { IonicStorageModule } from '@ionic/storage-angular';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { AlertComponent } from './components/alert/alert.component';
import { AlertService } from './services/alert.service';
import { SearchPipe } from './pipes/search.pipe';
import { ModalService } from './services/modal.service';
import { ModalComponent } from './components/modal/modal.component';
import { SearchIPPipe } from './pipes/searchip.pipe';
import { MainBluetoothPageComponent } from './pages/main-bluetooth-page/main-bluetooth-page.component';
import { FileUploaderComponent } from './components/file-uploader/file-uploader.component';
import { ReportIncidentComponent } from './pages/report-incident/report-incident.component';


@NgModule({
  declarations: [AppComponent, ContainerComponent, AlertComponent,
    ModalComponent,
    MainBluetoothPageComponent,
    FileUploaderComponent,
    ReportIncidentComponent],
  imports: [
    AppRoutingModule,
    HttpClientModule,
    BrowserModule,
    IonicModule.forRoot({ mode: 'md', scrollAssist: false }),
    IonicStorageModule.forRoot(),
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    SearchPipe
],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },AlertService, SearchPipe, ModalService, SearchIPPipe],
  bootstrap: [AppComponent],
})
export class AppModule {}
