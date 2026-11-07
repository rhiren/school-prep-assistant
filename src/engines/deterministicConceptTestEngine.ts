import type { TestSession } from "../domain/models";
import type {
  ContentRepository,
  StudentProfileService,
  TestGenerationService,
  ProgressService,
} from "../services/contracts";
import type { SessionRepository } from "../storage/repositories";
import { createId } from "../utils/id";
import type { QuestionSelectionStrategy } from "./questionSelectionStrategy";
import { checkAvailability } from "../services/understandingChecks";

export class DeterministicConceptTestEngine implements TestGenerationService {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly selectionStrategy: QuestionSelectionStrategy,
    private readonly studentProfileService: Pick<StudentProfileService, "getActiveStudentId"> = {
      getActiveStudentId: async () => "student-1",
    },
    private readonly progressService?: Pick<ProgressService, "getConceptAttempts">,
  ) {}

  async createConceptSession(
    conceptId: string,
    testSetId?: string,
    options?: {
      questionIds?: string[];
      smartRetry?: TestSession["smartRetry"];
    },
  ): Promise<TestSession> {
    const concept = await this.contentRepository.getConcept(conceptId);
    if (!concept) {
      throw new Error(`Unknown concept: ${conceptId}`);
    }

    const resolvedTestSetId =
      testSetId ??
      (await this.contentRepository.getTestSetsForConcept(conceptId))[0]?.id;

    const questionIds = options?.questionIds;
    const testSet = resolvedTestSetId ? await this.contentRepository.getTestSet(resolvedTestSetId) : null;
    let understandingCheck: TestSession["understandingCheck"];
    if (testSet?.type === "understanding-check") {
      if (testSet.conceptId !== conceptId || questionIds || !this.progressService) throw new Error("Invalid understanding check request.");
      const available = checkAvailability(await this.progressService.getConceptAttempts(conceptId), testSet);
      if (!available.ready || !available.priorPracticeAt) throw new Error(available.label);
      const existing = Object.values(await this.sessionRepository.list()).find(s => s.testSetId === resolvedTestSetId && s.status === "in_progress");
      if (existing) return existing;
      understandingCheck = { priorPracticeAt: available.priorPracticeAt };
    }
    const questions = questionIds
      ? (
          await Promise.all(
            questionIds.map((questionId) => this.contentRepository.getQuestionById(questionId)),
          )
        ).filter((question): question is NonNullable<typeof question> => Boolean(question))
      : resolvedTestSetId
        ? await this.contentRepository.getQuestionsForTestSet(resolvedTestSetId)
        : [];

    if (questions.length === 0 || (questionIds && questions.length !== questionIds.length)) {
      throw new Error(`No questions found for concept ${conceptId}.`);
    }

    const targetCount = Math.min(concept.testQuestionCount ?? questions.length, questions.length);
    const selectedQuestions = questionIds
      ? questions
      : this.selectionStrategy.selectQuestions(questions, {
          concept,
          targetCount,
        });
    const now = new Date().toISOString();
    const studentId = await this.studentProfileService.getActiveStudentId();

    const session: TestSession = {
      id: createId("session"),
      studentId,
      mode: "concept",
      courseId: concept.courseId,
      conceptId: concept.id,
      testSetId: resolvedTestSetId,
      conceptIds: [concept.id],
      questionIds: selectedQuestions.map((question) => question.id),
      answers: {},
      understandingCheck,
      answerHistory: {},
      smartRetry: options?.smartRetry,
      currentQuestionIndex: 0,
      status: "in_progress",
      createdAt: now,
      updatedAt: now,
    };

    await this.sessionRepository.save(session);
    return session;
  }
}
