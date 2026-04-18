export type MasteryStatus =
  | "not_started"
  | "in_progress"
  | "practiced"
  | "needs_review"
  | "mastered";

export type QuestionType = "multiple_choice" | "numeric" | "short_text";
export type DifficultyLevel = "easy" | "medium" | "hard" | "challenge";
export type SessionMode = "concept" | "mixed";
export type SessionStatus = "in_progress" | "submitted";
export type AnswerType = "ratio" | "fraction" | "decimal" | "number";

export interface StudentProfile {
  studentId: string;
  displayName: string;
  gradeLevel?: string;
  createdAt: string;
  lastActiveAt: string;
  isActive: boolean;
}

export interface Course {
  id: string;
  subjectId: string;
  subjectTitle: string;
  courseId: string;
  courseTitle: string;
  title: string;
  description: string;
  order: number;
  units: Unit[];
}

export interface Unit {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  concepts: Concept[];
}

export interface Concept {
  id: string;
  courseId: string;
  unitId: string;
  title: string;
  description: string;
  tags: string[];
  order: number;
  masteryStatus: MasteryStatus;
  testQuestionCount?: number;
  hasTest: boolean;
}

export interface TestSet {
  id: string;
  conceptId: string;
  title: string;
  description: string;
  questionCount: number;
}

export interface QuestionOption {
  id: string;
  label: string;
  value: string;
}

export interface Question {
  id: string;
  courseId: string;
  unitId: string;
  conceptId: string;
  tags: string[];
  difficulty: DifficultyLevel;
  questionType: QuestionType;
  answerType: AnswerType;
  prompt: string;
  choices?: QuestionOption[];
  correctAnswer: string;
  explanation: string;
  hint?: string;
  eligibleForMixed: boolean;
}

export interface AnswerRecord {
  questionId: string;
  response: string;
  answeredAt: string;
}

export interface ScoredQuestionResult {
  questionId: string;
  isCorrect: boolean;
  submittedAnswer: string | null;
  correctAnswer: string;
  feedbackTip?: string | null;
}

export interface ScoreSummary {
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  percentage: number;
}

export interface TestSession {
  id: string;
  studentId: string;
  mode: SessionMode;
  courseId: string;
  conceptId?: string;
  testSetId?: string;
  conceptIds: string[];
  questionIds: string[];
  answers: Record<string, AnswerRecord>;
  currentQuestionIndex: number;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TestAttempt {
  attemptId: string;
  studentId: string;
  sessionId: string;
  mode: SessionMode;
  courseId: string;
  conceptId?: string;
  testSetId?: string;
  conceptIds: string[];
  questionIds: string[];
  answers: Record<string, AnswerRecord>;
  results: ScoredQuestionResult[];
  summary: ScoreSummary;
  submittedAt: string;
}

export interface ProgressRecord {
  studentId: string;
  conceptId: string;
  courseId: string;
  attemptCount: number;
  latestScore: number | null;
  bestScore: number | null;
  masteryStatus: MasteryStatus;
  lastAttemptedAt: string | null;
  lastModified: string | null;
}

export interface CourseManifestDocument {
  courses: Course[];
}

export type SubjectManifest = CourseManifestDocument;
export type LearningContentIndex = ContentIndex;
export type LearningProgressRecord = ProgressRecord;

export interface QuestionBankDocument {
  id: string;
  conceptId: string;
  title: string;
  description: string;
  questions: Question[];
}

export interface ContentIndex {
  courses: Course[];
  coursesById: Record<string, Course>;
  conceptsById: Record<string, Concept>;
  questionsById: Record<string, Question>;
  conceptQuestionIds: Record<string, string[]>;
  testSetsById: Record<string, TestSet>;
  testSetsByConceptId: Record<string, TestSet[]>;
  testSetQuestionIds: Record<string, string[]>;
  tutorialsByConceptId: Record<string, string>;
}
