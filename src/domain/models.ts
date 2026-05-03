export type MasteryStatus =
  | "not_started"
  | "in_progress"
  | "practiced"
  | "needs_review"
  | "mastered";

export type QuestionType = "multiple_choice" | "numeric" | "short_text";
export type DifficultyLevel =
  | "scaffold"
  | "standard"
  | "easy"
  | "medium"
  | "hard"
  | "challenge";
export type SessionMode = "concept" | "mixed";
export type SessionStatus = "in_progress" | "submitted";
export type AnswerType = "ratio" | "fraction" | "decimal" | "number";
export type ConceptType = "core" | "overview" | "application" | "mixed-review";
export type SkillTag =
  | "computation"
  | "conceptual"
  | "vocabulary"
  | "application"
  | "reasoning"
  | "word-problem"
  | "multi-step"
  | "graph"
  | "visual";
export type StudentProfileType = "production" | "test";
export type StudentFeatureFlags = Record<string, boolean>;
export type SmartRetryKind = "targeted";

export interface SmartRetryStartState {
  conceptId: string;
  weakSkillsBefore: SkillTag[];
  attemptCountBefore: number;
}

export interface SmartRetryOutcome {
  conceptId: string;
  retryScore: number;
  weakSkillsBefore: SkillTag[];
  weakSkillsAfter: SkillTag[];
  attemptCountBefore: number;
  attemptCountAfter: number;
  improved: boolean;
}

export interface PlacementLevel {
  instructionalGrade?: string;
  programPathway?: string;
}

export interface PlacementProfile {
  overall?: PlacementLevel;
  subjects?: Record<string, PlacementLevel>;
}

export interface StudentProfile {
  studentId: string;
  displayName: string;
  gradeLevel?: string;
  homeGrade?: string;
  placementProfile?: PlacementProfile;
  profileType?: StudentProfileType;
  featureFlags?: StudentFeatureFlags;
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
  instructionalGrades?: string[];
  programPathways?: string[];
  standardsFrameworks?: string[];
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

export interface ConceptMeta {
  type: ConceptType;
  assessable: boolean;
}

export interface Concept {
  id: string;
  courseId: string;
  unitId: string;
  title: string;
  description: string;
  tags: string[];
  skillTags?: SkillTag[];
  meta?: ConceptMeta;
  instructionalGrades?: string[];
  programPathways?: string[];
  standardsFrameworks?: string[];
  order: number;
  masteryStatus: MasteryStatus;
  testQuestionCount?: number;
  hasTest: boolean;
}

export interface DifficultyProfile {
  scaffold: boolean;
  standard: boolean;
  challenge: boolean;
}

export interface TestSet {
  id: string;
  conceptId: string;
  title: string;
  description: string;
  questionCount: number;
  type?: "concept" | "review" | "practice";
  path?: string;
  difficultyProfile?: DifficultyProfile;
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
  skillTags?: SkillTag[];
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

export interface SmartRetryMetadata {
  kind: SmartRetryKind;
  cycle: number;
  startState?: SmartRetryStartState;
  outcome?: SmartRetryOutcome;
}

export interface ScoredQuestionResult {
  questionId: string;
  conceptId?: string;
  isCorrect: boolean;
  submittedAnswer: string | null;
  correctAnswer: string;
  skillTags?: SkillTag[];
  difficulty?: DifficultyLevel;
  feedbackTip?: string | null;
}

export interface ScoreSummary {
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  percentage: number;
}

export interface AttemptDurationSignal {
  startedAt: string;
  durationMs: number;
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
  smartRetry?: SmartRetryMetadata;
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
  smartRetry?: SmartRetryMetadata;
  durationSignal?: AttemptDurationSignal;
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
