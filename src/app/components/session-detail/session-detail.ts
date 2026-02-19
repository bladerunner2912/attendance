import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { APP_CONFIG } from '../../config/app-config';
import { Auth } from '../../services/auth';
import { DashboardService, ErrorResponse } from '../../services/dashboard';

@Component({
  selector: 'app-session-detail',
  imports: [CommonModule],
  templateUrl: './session-detail.html',
  styleUrl: './session-detail.css',
})
export class SessionDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly dashboardService = inject(DashboardService);

  readonly classId = signal('');
  readonly sessionId = signal('');
  readonly className = signal('Class');
  readonly sessionName = signal('Session');
  readonly description = signal('');
  readonly sessionDate = signal('');
  readonly durationMinutes = signal('');
  readonly startTime = signal('');
  readonly endTime = signal('');
  readonly presentStudents = signal<string[]>([]);
  readonly absentStudents = signal<string[]>([]);
  readonly presentCount = signal(0);
  readonly absentCount = signal(0);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  readonly totalStudents = computed(() => this.presentCount() + this.absentCount());
  readonly presentPercent = computed(() => {
    const total = this.totalStudents();
    if (total === 0) {
      return 0;
    }
    return Math.round((this.presentCount() / total) * 100);
  });
  readonly pieBackground = computed(
    () =>
      `conic-gradient(#1f8f4a 0 ${this.presentPercent()}%, #d15a5a ${this.presentPercent()}% 100%)`
  );

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const classId = params.get('classId') || '';
      this.classId.set(classId);
      const user = this.auth.getUser<{
        id?: number | string;
        user_id?: number | string;
        userId?: number | string;
        role?: string;
        student_id?: number | string;
        studentId?: number | string;
      }>();
      const role = (user?.role || this.auth.getRole() || '').toLowerCase();
      if (role === 'student') {
        const fallbackId = user?.id || user?.user_id || user?.userId;
        const studentId = user?.student_id || user?.studentId || fallbackId;
        if (studentId) {
          const className = this.route.snapshot.queryParamMap.get('className') || 'Class';
          this.router.navigate(['/dashboard/class', classId, 'student', String(studentId)], {
            queryParams: { className },
          });
        } else {
          this.router.navigate(['/dashboard']);
        }
        return;
      }
      const sessionId = params.get('sessionId') || '';
      this.sessionId.set(sessionId);
      this.loadSessionSummary(sessionId);
    });

    this.route.queryParamMap.subscribe((query) => {
      this.className.set(query.get('className') || 'Class');
      this.sessionName.set(query.get('sessionName') || 'Session');
      this.description.set(query.get('description') || '-');
      this.sessionDate.set(query.get('date') || '-');
      this.durationMinutes.set(query.get('durationMinutes') || '-');
      this.startTime.set(query.get('startTime') || '-');
      this.endTime.set(query.get('endTime') || '-');
      const shouldRefresh = query.get('refresh');
      if (shouldRefresh && this.sessionId()) {
        this.loadSessionSummary(this.sessionId());
      }
    });
  }

  goBack() {
    this.router.navigate(['/dashboard/class', this.classId()], {
      queryParams: { name: this.className() },
    });
  }

  formatDisplayDate(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }
    return new Intl.DateTimeFormat(APP_CONFIG.ui.dateLocale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(parsed);
  }

  formatDisplayTime(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    const match = value.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
    if (!match) {
      return '';
    }
    return `${match[1]}:${match[2]}`;
  }

  private loadSessionSummary(sessionId: string) {
    const parsedSessionId = Number(sessionId);
    if (!Number.isFinite(parsedSessionId) || parsedSessionId <= 0) {
      this.isLoading.set(false);
      this.errorMessage.set('Invalid session id.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.dashboardService.fetchAttendanceBySession(parsedSessionId).subscribe({
      next: (res) => {
        this.sessionId.set(String(res.session_id));
        this.sessionName.set(res.session?.name || this.sessionName());
        this.description.set(res.session?.description || '-');
        this.sessionDate.set(res.session?.session_date || '-');
        this.durationMinutes.set(String(res.session?.duration ?? '-'));
        this.startTime.set(res.session?.start_time || '-');
        this.endTime.set(res.session?.end_time || '-');

        this.presentStudents.set(Array.isArray(res.present) ? res.present : []);
        this.absentStudents.set(Array.isArray(res.absent) ? res.absent : []);
        this.presentCount.set(Number(res.present_count) || 0);
        this.absentCount.set(Number(res.absent_count) || 0);
        this.isLoading.set(false);
      },
      error: (err) => {
        const message = (err?.error as ErrorResponse | undefined)?.message;
        this.errorMessage.set(message || 'Unable to load session attendance details.');
        this.isLoading.set(false);
      },
    });
  }
}
