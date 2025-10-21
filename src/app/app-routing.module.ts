import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { RouteNames } from './route-names';
import { ReportIncidentComponent } from './pages/report-incident/report-incident.component';
import { IncidentStatusComponent } from './pages/incident-status/incident-status.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { DonationPageComponent } from './pages/donation-page/donation-page.component';
import { IncidentDonateComponent } from './pages/incident-donate/incident-donate.component';

const routes: Routes = [
  {
    path: RouteNames.Dashboard,          // e.g. '/d'
    component: DashboardComponent,
    children: [
      {
        path: 'report-incident',         
        component: ReportIncidentComponent
      },
      { path: 'donations', component: DonationPageComponent },
      {
        path: '',                        // default to report incident
        redirectTo: 'report-incident',
        pathMatch: 'full'
      }
    ]
  },
  {
        path: 'incident-status/:id',        
        component: IncidentStatusComponent
  },
  {
  path: 'd/donate/:id',
  component: IncidentDonateComponent
  },
  { path: '**', redirectTo: RouteNames.Dashboard } // fallback
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
