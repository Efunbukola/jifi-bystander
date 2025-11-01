import { LoginComponent } from './pages/login/login.component';
import { SignupComponent } from './pages/signup/signup.component';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { DonationPageComponent } from './pages/donation-page/donation-page.component';
import { IncidentStatusComponent } from './pages/incident-status/incident-status.component';
import { ReportIncidentComponent } from './pages/report-incident/report-incident.component';
import { RouteNames } from './route-names';
import { AuthGuard } from './gaurds/auth.guard';
import { UnauthGuard } from './gaurds/unauth.guard';
import { NgModule } from '@angular/core';
import { BystanderProfileComponent } from './pages/bystander-profile/bystander-profile.component';
import { IncidentDonateComponent } from './pages/incident-donate/incident-donate.component';


const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [UnauthGuard] },  
  { path: 'signup', component: SignupComponent, canActivate: [UnauthGuard] },

  {
  path: RouteNames.Dashboard,
  component: DashboardComponent,
  canActivate: [AuthGuard],
  children: [
    { path: 'report-incident', component: ReportIncidentComponent },
    { path: 'donations', component: DonationPageComponent },
    { path: 'profile', component: BystanderProfileComponent },
    { path: '', redirectTo: 'report-incident', pathMatch: 'full' },
  ],
},
 {
  path: 'd/donate/:id',
  component: IncidentDonateComponent
  },

  { path: 'incident-status/:id', component: IncidentStatusComponent },
  { path: '**', redirectTo: '/login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule]
})
export class AppRoutingModule {}



