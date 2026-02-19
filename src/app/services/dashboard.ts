import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { APP_CONFIG } from '../config/app-config';

export interface UserClassTile {
  name: string;
}

export interface UserProfileResponse {
  id?: string;
  userId?: string;
  role?: string;
  classes?: Array<{ name?: string; className?: string; title?: string }>;
}

export type ClassItem = {
  id: number;
  name: string;
  subject: string | null;
  instructor_id: number;
  instructor_user_id: number;
  instructor_name: string;
};

export type ClassListResponse = { classes: ClassItem[] };

export type SessionItem = {
  id: number;
  class_id: number;
  name: string;
  description: string | null;
  session_date: string | null;
  duration: number;
  start_time: string | null;
  end_time: string | null;
};

export type SessionListResponse = { sessions: SessionItem[] };

export type ErrorResponse = { message: string };

export type ClassStudentItem = {
  id: number;
  user_id: number;
  fullname: string;
  phone_no: string;
  email: string;
};

export type ClassStudentsResponse = { students: ClassStudentItem[] };

export type ClassAttendanceSummaryStudent = {
  student_id: number;
  fullname: string;
  email: string;
  phone_no: string;
  attended_sessions: number | string;
  total_sessions: number | string;
  present_attendance_percentage: number | string;
};

export type ClassAttendanceSummaryResponse = {
  class_id: number;
  students: ClassAttendanceSummaryStudent[];
};

export type AddSessionRequest = {
  class_id: number;
  name: string;
  description: string;
  session_date: string;
  duration: number;
  start_time?: string;
};

export type AddSessionResponse = {
  message: string;
  session_id: number;
};

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';

export type BulkAttendanceRequest = {
  session_id: number;
  attendance: Array<{
    student_id: number;
    status: AttendanceStatus;
  }>;
};

export type BulkAttendanceResponse = {
  message: string;
  session_id: number;
  inserted_or_updated: number;
};

export type SessionAttendanceSummaryResponse = {
  session_id: number;
  session: SessionItem;
  present: string[];
  absent: string[];
  present_count: number;
  absent_count: number;
};

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private baseUrl = APP_CONFIG.apiBaseUrl;
  readonly information = signal<ClassListResponse | null>(null);
  readonly classes = signal<ClassItem[]>([]);
  readonly classNames = signal<string[]>([]);

  constructor(private http: HttpClient) { }

  fetchUserProfile(userId: string | number) {
    return this.http.get<UserProfileResponse>(`${this.baseUrl}/users/${String(userId)}`);
  }

  fetchInstructorClasses(instructorId: string | number) {
    return this.http.get<ClassListResponse>(
      `${this.baseUrl}/classes/instructor/${String(instructorId)}`
    );
  }

  fetchStudentClasses(studentId: string | number) {
    return this.http.get<ClassListResponse>(
      `${this.baseUrl}/classes/student/${String(studentId)}`
    );
  }

  fetchClassSessions(classId: string | number) {
    return this.http.get<SessionListResponse>(`${this.baseUrl}/sessions/${String(classId)}`);
  }

  fetchClassStudents(classId: string | number) {
    return this.http.get<ClassStudentsResponse>(
      `${this.baseUrl}/classes/${String(classId)}/students`
    );
  }

  fetchClassAttendanceSummary(classId: string | number) {
    return this.http.get<ClassAttendanceSummaryResponse>(
      `${this.baseUrl}/classes/${String(classId)}/attendance-summary`
    );
  }

  addSession(payload: AddSessionRequest) {
    return this.http.post<AddSessionResponse>(`${this.baseUrl}/sessions`, payload);
  }

  bulkUpsertAttendance(payload: BulkAttendanceRequest) {
    return this.http.post<BulkAttendanceResponse>(`${this.baseUrl}/attendance/bulk`, payload);
  }

  fetchAttendanceBySession(sessionId: string | number) {
    return this.http.get<SessionAttendanceSummaryResponse>(
      `${this.baseUrl}/attendance/session/${String(sessionId)}`
    );
  }

  setClasses(classes: ClassItem[]) {
    this.classes.set(classes);
  }

  setInformation(information: ClassListResponse) {
    this.information.set(information);
    const classes: ClassItem[] = Array.isArray(information.classes) ? information.classes : [];
    this.classes.set(classes);
    const names = classes
      .map((item: ClassItem) => item.name)
      .filter((name: string) => name.length > 0);
    this.classNames.set(names);
  }
}
