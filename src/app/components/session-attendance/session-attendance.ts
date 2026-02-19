import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { APP_CONFIG } from '../../config/app-config';
import {
  ClassStudentItem,
  DashboardService,
  ErrorResponse,
} from '../../services/dashboard';
import { Prompt } from '../prompt/prompt';

type Student = ClassStudentItem;

@Component({
  selector: 'app-session-attendance',
  imports: [CommonModule, Prompt],
  templateUrl: './session-attendance.html',
  styleUrl: './session-attendance.css',
})
export class SessionAttendance implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dashboardService = inject(DashboardService);

  readonly classId = signal('');
  readonly sessionId = signal('');
  readonly className = signal('Class');
  readonly sessionName = signal('Session');
  readonly sessionDate = signal('');
  readonly sessionTime = signal('');
  readonly durationMinutes = signal('');
  readonly description = signal('');

  readonly presentStudents = signal<Student[]>([]);
  readonly unmarkedStudents = signal<Student[]>([]);
  readonly isLoadingStudents = signal(true);
  readonly isSubmittingAttendance = signal(false);
  readonly pageError = signal('');
  readonly successMessage = signal('');
  readonly showConfirmPrompt = signal(false);
  readonly confirmPromptMessage = signal('');

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const classId = params.get('classId') || '';
      this.classId.set(classId);
      this.sessionId.set(params.get('sessionId') || '');
      this.loadClassStudents(classId);
    });

    this.route.queryParamMap.subscribe((query) => {
      this.className.set(query.get('className') || 'Class');
      this.sessionName.set(query.get('sessionName') || 'Session');
      this.description.set(query.get('description') || '');
      this.sessionDate.set(query.get('date') || '');
      this.sessionTime.set(query.get('time') || '');
      this.durationMinutes.set(query.get('durationMinutes') || '');
    });
  }

  markPresent(student: Student) {
    this.unmarkedStudents.set(this.unmarkedStudents().filter((s) => s.id !== student.id));
    this.presentStudents.set([...this.presentStudents(), student]);
  }

  removePresent(student: Student) {
    this.presentStudents.set(this.presentStudents().filter((s) => s.id !== student.id));
    this.unmarkedStudents.set([...this.unmarkedStudents(), student]);
  }

  confirmAttendance() {
    if (this.isSubmittingAttendance()) {
      return;
    }

    const sessionId = Number(this.sessionId());
    if (!Number.isFinite(sessionId) || sessionId <= 0) {
      this.pageError.set('Invalid or missing session id.');
      return;
    }

    const present = this.presentStudents().map((s) => s.fullname).join(', ') || 'None';
    const absent = this.unmarkedStudents().map((s) => s.fullname).join(', ') || 'None';
    const message =
      `Present: ${present}\n` +
      `Absent: ${absent}\n\n` +
      `Confirm to mark attendance for session "${this.sessionName()}"?`;
    this.confirmPromptMessage.set(message);
    this.showConfirmPrompt.set(true);
  }

  onPromptCancel() {
    this.showConfirmPrompt.set(false);
  }

  onPromptConfirm() {
    this.showConfirmPrompt.set(false);
    const sessionId = Number(this.sessionId());
    if (!Number.isFinite(sessionId) || sessionId <= 0) {
      this.pageError.set('Invalid or missing session id.');
      return;
    }

    const attendance = [
      ...this.presentStudents().map((student) => ({
        student_id: student.id,
        status: 'PRESENT' as const,
      })),
      ...this.unmarkedStudents().map((student) => ({
        student_id: student.id,
        status: 'ABSENT' as const,
      })),
    ];

    this.pageError.set('');
    this.successMessage.set('');
    this.isSubmittingAttendance.set(true);
    this.dashboardService.bulkUpsertAttendance({ session_id: sessionId, attendance }).subscribe({
      next: (res) => {
        this.isSubmittingAttendance.set(false);
        this.successMessage.set(
          `${res.message}. Updated records: ${res.inserted_or_updated}`
        );
        this.router.navigate(['/dashboard/class', this.classId(), 'session', sessionId], {
          queryParams: {
            className: this.className(),
            sessionName: this.sessionName(),
            description: this.description(),
            date: this.sessionDate(),
            durationMinutes: this.durationMinutes(),
            startTime: this.sessionTime(),
            endTime: '-',
            refresh: Date.now(),
          },
        });
      },
      error: (err) => {
        this.isSubmittingAttendance.set(false);
        const apiMessage = (err?.error as ErrorResponse | undefined)?.message;
        this.pageError.set(apiMessage || 'Failed to mark attendance.');
      },
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

  private loadClassStudents(classId: string) {
    const classIdNumber = Number(classId);
    if (!Number.isFinite(classIdNumber) || classIdNumber <= 0) {
      this.unmarkedStudents.set([]);
      this.isLoadingStudents.set(false);
      this.pageError.set('Invalid class id.');
      return;
    }

    this.pageError.set('');
    this.isLoadingStudents.set(true);
    this.dashboardService.fetchClassStudents(classIdNumber).subscribe({
      next: (res) => {
        const students = Array.isArray(res?.students) ? res.students : [];
        this.unmarkedStudents.set(students);
        this.presentStudents.set([]);
        this.isLoadingStudents.set(false);
      },
      error: (err) => {
        this.unmarkedStudents.set([]);
        this.presentStudents.set([]);
        this.isLoadingStudents.set(false);
        const apiMessage = (err?.error as ErrorResponse | undefined)?.message;
        this.pageError.set(apiMessage || 'Failed to load class students.');
      },
    });
  }
}
