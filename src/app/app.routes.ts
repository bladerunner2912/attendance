import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Dashboard } from './components/dashboard/dashboard';
import { ClassPage } from './components/class-page/class-page';
import { SessionAttendance } from './components/session-attendance/session-attendance';
import { SessionDetail } from './components/session-detail/session-detail';
import { StudentProfile } from './components/student-profile/student-profile';
import { authGuard } from './services/auth-guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: Login },
  {
    path: 'dashboard/class/:classId/session/:sessionId/take-attendance',
    component: SessionAttendance,
    canActivate: [authGuard],
  },
  {
    path: 'dashboard/class/:classId/session/:sessionId',
    component: SessionDetail,
    canActivate: [authGuard],
  },
  {
    path: 'dashboard/class/:classId/student/:studentId',
    component: StudentProfile,
    canActivate: [authGuard],
  },
  { path: 'dashboard/class/:classId', component: ClassPage, canActivate: [authGuard] },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: '**', redirectTo: 'login' },
];
