import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';
import { ClassListResponse, DashboardService, ErrorResponse } from '../../services/dashboard';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly dashboardService = inject(DashboardService);

  readonly role = computed(() => this.auth.getRole() || 'student');
  readonly headerTitle = computed(() =>
    this.role().toLowerCase() === 'instructor' ? 'Instructor Dashboard' : 'Student Dashboard'
  );
  readonly classTiles = computed(() =>
    this.dashboardService
      .classes()
      .map((item) => ({
        id: item.id,
        name: item.name,
      }))
  );
  readonly classNames = computed(() => this.classTiles().map((tile) => tile.name));
  readonly isLoading = signal(true);
  readonly currentStudentId = signal<string>('');
  readonly emptyMessage = computed(() =>
    this.role().toLowerCase() === 'instructor'
      ? 'No classes yet. Add your first class.'
      : 'No classes yet. Join a class to get started.'
  );

  ngOnInit() {
    const user = this.auth.getUser<{
      id?: number | string;
      user_id?: number | string;
      userId?: number | string;
      role?: string;
      instructor_id?: number | string;
      instructorId?: number | string;
      student_id?: number | string;
      studentId?: number | string;
    }>();

    const role = (user?.role || this.auth.getRole() || 'student').toLowerCase();
    const fallbackId = user?.id || user?.user_id || user?.userId;
    const instructorId = user?.instructor_id || user?.instructorId || fallbackId;
    const studentId = user?.student_id || user?.studentId || fallbackId;
    this.currentStudentId.set(studentId ? String(studentId) : '');

    const handleClasses = (res: ClassListResponse) => {
      console.log('dashboard classes response is being ', res);
      this.dashboardService.setInformation(res);
      this.isLoading.set(false);
    };

    const loadStudent = (fallbackToInstructor: boolean) => {
      if (!studentId) {
        if (fallbackToInstructor && instructorId) {
          loadInstructor(false);
          return;
        }
        this.isLoading.set(false);
        return;
      }

      this.dashboardService.fetchStudentClasses(studentId).subscribe({
        next: (res) => {
          const classes = res?.classes ?? [];
          if (classes.length === 0 && fallbackToInstructor && instructorId) {
            loadInstructor(false);
            return;
          }
          handleClasses(res);
        },
        error: (err) => {
          const message = (err?.error as ErrorResponse | undefined)?.message || err;
          console.log('dashboard classes response is being ', message);
          if (fallbackToInstructor && instructorId) {
            loadInstructor(false);
            return;
          }
          this.isLoading.set(false);
        },
      });
    };

    const loadInstructor = (fallbackToStudent: boolean) => {
      if (!instructorId) {
        if (fallbackToStudent && studentId) {
          loadStudent(false);
          return;
        }
        this.isLoading.set(false);
        return;
      }

      this.dashboardService.fetchInstructorClasses(instructorId).subscribe({
        next: (res) => {
          const classes = res?.classes ?? [];
          if (classes.length === 0 && fallbackToStudent && studentId) {
            loadStudent(false);
            return;
          }
          handleClasses(res);
        },
        error: (err) => {
          const message = (err?.error as ErrorResponse | undefined)?.message || err;
          console.log('dashboard classes response is being ', message);
          if (fallbackToStudent && studentId) {
            loadStudent(false);
            return;
          }
          this.isLoading.set(false);
        },
      });
    };

    if (role === 'instructor' || (!!instructorId && !studentId)) {
      loadInstructor(true);
      return;
    }

    if (role === 'student' || !!studentId) {
      loadStudent(true);
      return;
    }

    this.isLoading.set(false);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  openClass(tile: { id: number | string; name: string }) {
    const role = this.role().toLowerCase();
    if (role === 'student') {
      const studentId = this.currentStudentId();
      if (!studentId) {
        return;
      }
      this.router.navigate(['/dashboard/class', tile.id, 'student', studentId], {
        queryParams: { className: tile.name },
      });
      return;
    }

    this.router.navigate(['/dashboard/class', tile.id], {
      queryParams: { name: tile.name },
    });
  }

}
