import type {
  AnswerRecord,
  Concept,
  Course,
  ProgressRecord,
  Question,
  TestSet,
  TestAttempt,
  TestSession,
  StudentProfile,
} from "../domain/models";

export interface ContentRepository {
  listCourses(): Promise<Course[]>;
  getCourse(courseId: string): Promise<Course | null>;
  getConcept(conceptId: string): Promise<Concept | null>;
  getQuestionsForConcept(conceptId: string): Promise<Question[]>;
  getQuestionById(questionId: string): Promise<Question | null>;
  getQuestionByIdSync(questionId: string): Question | null;
  getCourseConcepts(courseId: string): Promise<Concept[]>;
  getTutorialContent(conceptId: string): Promise<string | null>;
  getTestSetsForConcept(conceptId: string): Promise<TestSet[]>;
  getTestSet(testSetId: string): Promise<TestSet | null>;
  getQuestionsForTestSet(testSetId: string): Promise<Question[]>;
}

export interface TestGenerationService {
  createConceptSession(conceptId: string, testSetId?: string): Promise<TestSession>;
}

export interface ScoringService {
  scoreSession(session: TestSession): Promise<TestAttempt>;
}

export interface ProgressService {
  getProgress(): Promise<ProgressRecord[]>;
  getConceptProgress(conceptId: string): Promise<ProgressRecord | null>;
  getConceptAttempts(conceptId: string): Promise<TestAttempt[]>;
  getAttempt(attemptId: string): Promise<TestAttempt | null>;
  updateFromAttempt(attempt: TestAttempt): Promise<void>;
}

export interface DataTransferServiceContract {
  exportProgress(): Promise<{
    appVersion: string;
    exportedAt: string;
    student?: {
      studentId: string;
      displayName: string;
      gradeLevel?: string;
    };
    data: {
      sessions: TestSession[];
      attempts: TestAttempt[];
      progress: ProgressRecord[];
    };
  }>;
  importProgress(value: unknown): Promise<{
    appVersion: string;
    exportedAt: string;
    student?: {
      studentId: string;
      displayName: string;
      gradeLevel?: string;
    };
    data: {
      sessions: TestSession[];
      attempts: TestAttempt[];
      progress: ProgressRecord[];
    };
  }>;
}

export interface SessionService {
  getSession(sessionId: string): Promise<TestSession | null>;
  getLatestInProgressSession(): Promise<TestSession | null>;
  saveAnswer(sessionId: string, answer: AnswerRecord): Promise<void>;
  setCurrentQuestionIndex(sessionId: string, index: number): Promise<void>;
  submitSession(sessionId: string): Promise<TestAttempt>;
}

export interface MixedTestService {
  getEligibility(courseId: string): Promise<{ unlocked: boolean; conceptIds: string[] }>;
}

export interface StudentProfileService {
  listProfiles(): Promise<StudentProfile[]>;
  getActiveProfile(): Promise<StudentProfile>;
  getActiveStudentId(): Promise<string>;
  setActiveStudent(studentId: string): Promise<StudentProfile>;
  createProfile(displayName: string, gradeLevel?: string): Promise<StudentProfile>;
}
