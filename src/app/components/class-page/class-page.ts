import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { APP_CONFIG } from '../../config/app-config';
import { Auth } from '../../services/auth';
import {
  ClassAttendanceSummaryStudent,
  DashboardService,
  ErrorResponse,
  SessionItem,
} from '../../services/dashboard';

type NormalizedClassAttendanceSummaryStudent = {
  student_id: number;
  fullname: string;
  email: string;
  phone_no: string;
  attended_sessions: number;
  total_sessions: number;
  present_attendance_percentage: number;
};

@Component({
  selector: 'app-class-page',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './class-page.html',
  styleUrl: './class-page.css',
})
export class ClassPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly dashboardService = inject(DashboardService);

  readonly className = signal('Class');
  readonly classId = signal<string>('');
  readonly isStudentRole = signal(false);
  readonly currentStudentId = signal('');
  readonly sessions = signal<SessionItem[]>([]);
  readonly isReverseOrder = signal(false);
  readonly displayedSessions = computed(() => {
    const sorted = [...this.sessions()].sort((a, b) => {
      const aTime = this.toTimeValue(a.session_date);
      const bTime = this.toTimeValue(b.session_date);
      return bTime - aTime;
    });
    return this.isReverseOrder() ? [...sorted].reverse() : sorted;
  });
  readonly sessionsPage = signal(1);
  readonly sessionsPageSize = APP_CONFIG.ui.sessionsPageSize;
  readonly totalSessionsPages = computed(() =>
    Math.max(1, Math.ceil(this.displayedSessions().length / this.sessionsPageSize))
  );
  readonly paginatedSessions = computed(() => {
    const page = Math.min(this.sessionsPage(), this.totalSessionsPages());
    const start = (page - 1) * this.sessionsPageSize;
    const end = start + this.sessionsPageSize;
    return this.displayedSessions().slice(start, end);
  });
  readonly isLoadingSessions = signal(true);
  readonly sessionsError = signal('');
  readonly activeSection = signal<'new' | 'previous' | 'details'>('new');
  readonly showSessionForm = signal(false);
  readonly formError = signal('');
  readonly isCreatingSession = signal(false);
  readonly classDetailsRows = signal<NormalizedClassAttendanceSummaryStudent[]>([]);
  readonly studentsPage = signal(1);
  readonly studentsPageSize = APP_CONFIG.ui.studentsPageSize;
  readonly totalStudentsPages = computed(() =>
    Math.max(1, Math.ceil(this.classDetailsRows().length / this.studentsPageSize))
  );
  readonly paginatedClassDetailsRows = computed(() => {
    const page = Math.min(this.studentsPage(), this.totalStudentsPages());
    const start = (page - 1) * this.studentsPageSize;
    const end = start + this.studentsPageSize;
    return this.classDetailsRows().slice(start, end);
  });
  readonly isLoadingClassDetails = signal(true);
  readonly classDetailsError = signal('');
  readonly maxSessionDate = this.toDateInputValue(new Date());
  readonly minSessionDate = this.toDateInputValue(this.getThreeYearsBackDate(new Date()));

  sessionForm = {
    sessionName: '',
    description: '',
    date: '',
    time: '',
    durationMinutes: APP_CONFIG.ui.defaultSessionDurationMinutes,
  };

  ngOnInit() {
    const user = this.auth.getUser<{
      id?: number | string;
      user_id?: number | string;
      userId?: number | string;
      role?: string;
      student_id?: number | string;
      studentId?: number | string;
    }>();
    const role = (user?.role || this.auth.getRole() || '').toLowerCase();
    const fallbackId = user?.id || user?.user_id || user?.userId;
    const studentId = user?.student_id || user?.studentId || fallbackId;
    this.isStudentRole.set(role === 'student');
    this.currentStudentId.set(studentId ? String(studentId) : '');

    this.route.paramMap.subscribe((params) => {
      const id = params.get('classId') || '';
      this.classId.set(id);
      if (this.isStudentRole() && this.currentStudentId()) {
        const className = this.route.snapshot.queryParamMap.get('name') || this.className();
        this.router.navigate(['/dashboard/class', id, 'student', this.currentStudentId()], {
          queryParams: { className },
        });
        return;
      }
      this.loadSessions(id);
    });

    this.route.queryParamMap.subscribe((query) => {
      const value = query.get('name');
      if (value) {
        this.className.set(value);
        return;
      }
      const matched = this.dashboardService
        .classes()
        .find((item) => String(item.id) === this.classId());
      this.className.set(matched?.name || 'Class');
    });
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  setSection(section: 'new' | 'previous' | 'details') {
    this.activeSection.set(section);
  }

  toggleReverseOrder() {
    this.isReverseOrder.set(!this.isReverseOrder());
    this.sessionsPage.set(1);
  }

  toggleSessionForm() {
    this.showSessionForm.set(!this.showSessionForm());
    this.formError.set('');
  }

  startSession() {
    if (!this.sessionForm.sessionName || !this.sessionForm.date || !this.sessionForm.time) {
      this.formError.set('Session name, date, and time are required.');
      return;
    }

    if (this.sessionForm.date < this.minSessionDate || this.sessionForm.date > this.maxSessionDate) {
      this.formError.set(
        `Session date must be between ${this.minSessionDate} and ${this.maxSessionDate}.`
      );
      return;
    }

    this.formError.set('');
    const classIdAsNumber = Number(this.classId());
    if (!Number.isFinite(classIdAsNumber) || classIdAsNumber <= 0) {
      this.formError.set('Invalid class id.');
      return;
    }

    this.isCreatingSession.set(true);
    this.dashboardService
      .addSession({
        class_id: classIdAsNumber,
        name: this.sessionForm.sessionName,
        description: this.sessionForm.description,
        session_date: this.sessionForm.date,
        duration: Number(this.sessionForm.durationMinutes),
        start_time: this.sessionForm.time || undefined,
      })
      .subscribe({
        next: (res) => {
          this.isCreatingSession.set(false);
          this.router.navigate(
            ['/dashboard/class', this.classId(), 'session', res.session_id, 'take-attendance'],
            {
            queryParams: {
              className: this.className(),
              sessionName: this.sessionForm.sessionName,
              description: this.sessionForm.description,
              date: this.sessionForm.date,
              time: this.sessionForm.time,
              durationMinutes: this.sessionForm.durationMinutes,
            },
            }
          );
        },
        error: (err) => {
          this.isCreatingSession.set(false);
          const message = (err?.error as ErrorResponse | undefined)?.message;
          this.formError.set(message || 'Unable to create session.');
        },
      });
  }

  sessionQueryParams(session: SessionItem) {
    return {
      className: this.className(),
      sessionName: session.name,
      description: session.description || '',
      date: session.session_date || '',
      durationMinutes: session.duration,
      startTime: session.start_time || '',
      endTime: session.end_time || '',
    };
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

  private loadSessions(classId: string) {
    if (!classId) {
      this.sessions.set([]);
      this.isLoadingSessions.set(false);
      return;
    }

    this.isLoadingSessions.set(true);
    this.sessionsError.set('');

    this.dashboardService.fetchClassSessions(classId).subscribe({
      next: (res) => {
        const sessions = Array.isArray(res?.sessions) ? res.sessions : [];
        this.sessions.set(sessions);
        this.sessionsPage.set(1);
        this.isLoadingSessions.set(false);
        this.loadClassDetails();
      },
      error: (err) => {
        this.sessions.set([]);
        const message = (err?.error as ErrorResponse | undefined)?.message;
        this.sessionsError.set(message || 'Unable to load previous sessions.');
        this.isLoadingSessions.set(false);
        this.loadClassDetails();
      },
    });
  }

  private getThreeYearsBackDate(today: Date): Date {
    const value = new Date(today);
    value.setFullYear(value.getFullYear() - 3);
    return value;
  }

  private toDateInputValue(value: Date): string {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toTimeValue(value: string | null | undefined): number {
    if (!value) {
      return 0;
    }
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private toNumber(value: number | string | null | undefined): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  private normalizeSummaryRow(
    student: ClassAttendanceSummaryStudent & Record<string, unknown>
  ): NormalizedClassAttendanceSummaryStudent {
    return {
      student_id: student.student_id,
      fullname: student.fullname,
      email: student.email,
      phone_no: student.phone_no,
      attended_sessions: this.toNumber(
        student.attended_sessions ??
          student['attended_session'] ??
          student['attendedSessions']
      ),
      total_sessions: this.toNumber(student.total_sessions ?? student['totalSessions']),
      present_attendance_percentage: this.toNumber(
        student.present_attendance_percentage ??
          student['present_attendance_session'] ??
          student['attendance_percentage'] ??
          student['presentAttendancePercentage']
      ),
    };
  }

  displayAttendedSessions(row: NormalizedClassAttendanceSummaryStudent): number {
    return this.toNumber(row?.attended_sessions);
  }

  displayAttendancePercentage(row: NormalizedClassAttendanceSummaryStudent): string {
    return this.toNumber(row?.present_attendance_percentage).toFixed(2);
  }

  studentProfileQueryParams(row: NormalizedClassAttendanceSummaryStudent) {
    return {
      className: this.className(),
      fullname: row.fullname,
      email: row.email,
      phoneNo: row.phone_no,
      attendedSessions: this.displayAttendedSessions(row),
      totalSessions: this.toNumber(row.total_sessions),
      attendancePercentage: this.displayAttendancePercentage(row),
    };
  }

  private loadClassDetails() {
    const classIdNumber = Number(this.classId());
    if (!Number.isFinite(classIdNumber) || classIdNumber <= 0) {
      this.classDetailsRows.set([]);
      this.classDetailsError.set('Invalid class id.');
      this.isLoadingClassDetails.set(false);
      return;
    }

    this.isLoadingClassDetails.set(true);
    this.classDetailsError.set('');

    this.dashboardService.fetchClassAttendanceSummary(classIdNumber).subscribe({
      next: (summaryRes) => {
        const rows = Array.isArray(summaryRes?.students)
          ? summaryRes.students.map((student) => this.normalizeSummaryRow(student))
          : [];
        this.classDetailsRows.set(rows);
        this.studentsPage.set(1);
        this.isLoadingClassDetails.set(false);
      },
      error: (err) => {
        const message = (err?.error as ErrorResponse | undefined)?.message;
        this.classDetailsRows.set([]);
        this.classDetailsError.set(message || 'Unable to load class students.');
        this.isLoadingClassDetails.set(false);
      },
    });
  }

  previousSessionsPage() {
    this.sessionsPage.update((value) => Math.max(1, value - 1));
  }

  nextSessionsPage() {
    this.sessionsPage.update((value) => Math.min(this.totalSessionsPages(), value + 1));
  }

  previousStudentsPage() {
    this.studentsPage.update((value) => Math.max(1, value - 1));
  }

  nextStudentsPage() {
    this.studentsPage.update((value) => Math.min(this.totalStudentsPages(), value + 1));
  }

}
