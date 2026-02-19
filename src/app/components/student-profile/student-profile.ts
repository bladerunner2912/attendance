import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { APP_CONFIG } from '../../config/app-config';
import { ClassAttendanceSummaryStudent, DashboardService, SessionItem } from '../../services/dashboard';

type SessionTile = {
  id: number;
  name: string;
  session_date: string | null;
  description: string | null;
  duration: number;
  start_time: string | null;
  end_time: string | null;
};

@Component({
  selector: 'app-student-profile',
  imports: [CommonModule],
  templateUrl: './student-profile.html',
  styleUrl: './student-profile.css',
})
export class StudentProfile implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dashboardService = inject(DashboardService);

  readonly classId = signal('');
  readonly studentId = signal('');
  readonly className = signal('Class');
  readonly fullname = signal('Student');
  readonly email = signal('');
  readonly phoneNo = signal('');
  readonly attendedSessionsCount = signal('0');
  readonly totalSessionsCount = signal('0');
  readonly attendancePercentage = signal('0.00');

  readonly missedSessions = signal<SessionTile[]>([]);
  readonly attendedSessions = signal<SessionTile[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const classId = params.get('classId') || '';
      const studentId = params.get('studentId') || '';
      this.classId.set(classId);
      this.studentId.set(studentId);
      this.loadStudentProfileAndSessions(classId, studentId);
    });

    this.route.queryParamMap.subscribe((query) => {
      this.className.set(query.get('className') || this.className());
      this.fullname.set(query.get('fullname') || this.fullname());
      this.email.set(query.get('email') || this.email());
      this.phoneNo.set(query.get('phoneNo') || this.phoneNo());
      this.attendedSessionsCount.set(query.get('attendedSessions') || this.attendedSessionsCount());
      this.totalSessionsCount.set(query.get('totalSessions') || this.totalSessionsCount());
      this.attendancePercentage.set(query.get('attendancePercentage') || this.attendancePercentage());
    });
  }

  goBack() {
    this.router.navigate(['/dashboard']);
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

  private loadStudentProfileAndSessions(classId: string, studentId: string) {
    const classIdNumber = Number(classId);
    const studentIdNumber = Number(studentId);
    if (!Number.isFinite(classIdNumber) || classIdNumber <= 0) {
      this.errorMessage.set('Invalid class id.');
      this.isLoading.set(false);
      return;
    }
    if (!Number.isFinite(studentIdNumber) || studentIdNumber <= 0) {
      this.errorMessage.set('Invalid student id.');
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.dashboardService.fetchClassAttendanceSummary(classIdNumber).subscribe({
      next: (summaryRes) => {
        const students = Array.isArray(summaryRes?.students) ? summaryRes.students : [];
        const matched = students.find((student) => Number(student.student_id) === studentIdNumber);
        if (matched) {
          this.applyStudentSummary(matched);
        }
        this.loadStudentSessions(classIdNumber);
      },
      error: () => {
        this.loadStudentSessions(classIdNumber);
      },
    });
  }

  private loadStudentSessions(classIdNumber: number) {
    this.dashboardService.fetchClassSessions(classIdNumber).subscribe({
      next: (res) => {
        const sessions = Array.isArray(res?.sessions) ? res.sessions : [];
        if (sessions.length === 0) {
          this.missedSessions.set([]);
          this.attendedSessions.set([]);
          this.isLoading.set(false);
          return;
        }

        Promise.all(
          sessions.map(
            (session) =>
              new Promise<{
                session: SessionItem;
                isPresent: boolean;
              }>((resolve) => {
                this.dashboardService.fetchAttendanceBySession(session.id).subscribe({
                  next: (summary) => {
                    const presentList = Array.isArray(summary?.present) ? summary.present : [];
                    const isPresent = presentList.includes(this.fullname());
                    resolve({ session, isPresent });
                  },
                  error: () => resolve({ session, isPresent: false }),
                });
              })
          )
        ).then((results) => {
          const missed: SessionTile[] = [];
          const attended: SessionTile[] = [];
          results.forEach((result) => {
            const tile = {
              id: result.session.id,
              name: result.session.name,
              session_date: result.session.session_date,
              description: result.session.description,
              duration: result.session.duration,
              start_time: result.session.start_time,
              end_time: result.session.end_time,
            };
            if (result.isPresent) {
              attended.push(tile);
            } else {
              missed.push(tile);
            }
          });
          this.missedSessions.set(missed);
          this.attendedSessions.set(attended);
          this.isLoading.set(false);
        });
      },
      error: () => {
        this.errorMessage.set('Unable to load student session details.');
        this.isLoading.set(false);
      },
    });
  }

  private applyStudentSummary(student: ClassAttendanceSummaryStudent) {
    const attended = Number(student.attended_sessions);
    const total = Number(student.total_sessions);
    const percentage = Number(student.present_attendance_percentage);
    this.fullname.set(student.fullname || this.fullname());
    this.email.set(student.email || '');
    this.phoneNo.set(student.phone_no || '');
    this.attendedSessionsCount.set(Number.isFinite(attended) ? String(attended) : '0');
    this.totalSessionsCount.set(Number.isFinite(total) ? String(total) : '0');
    this.attendancePercentage.set(Number.isFinite(percentage) ? percentage.toFixed(2) : '0.00');
  }

}
