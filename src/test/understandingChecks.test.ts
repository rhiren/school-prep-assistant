import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppServices } from "../state/AppServicesProvider";
import { MemoryStorageService } from "../storage/memoryStorageService";
import { createDefaultContentRepository } from "../services/contentRepository";
import { checkAvailability, CHECK_DELAY_MS, summarizeUnderstandingCheck } from "../services/understandingChecks";
import { getStudentScopedKey, STORE_NAMES } from "../storage/repositories";
import type { TestAttempt } from "../domain/models";

const slugs = ["operations-with-scientific-notation", "repeating-decimals-fractions", "approximate-irrational-numbers"];
const id = `course3-${slugs[0]}-understanding-check`;
const concept = `concept-${slugs[0]}`;
afterEach(() => vi.useRealTimers());

describe("understanding check release", () => {
  it("provides three distinct eight-question packs with increasing difficulty and balanced choices", async () => {
    const repo = await createDefaultContentRepository();
    const answers = [
      ["6000000","4.2 x 10^3","720000","4.5 x 10^5 bytes","3000","Use a common power before adding: the result is 5.2 x 10^4.","1.8 x 10^-4","2000000"],
      ["7/9","100x - x","4/11","The second rate, by 1/300 of a job per hour.","1/6","Use 27/99 because 100x - x = 27.","No; 2/9 exceeds 0.222 by 1/4500.","5/6"],
      ["7","10 and 11","6.2","8.1 < length < 8.2","5","5.45 squared is 29.7025, so sqrt(30) rounds to 5.5.","No; also compare 52 with the square of the midpoint 7.25.","9"],
    ];
    for (const [i, slug] of slugs.entries()) {
      const set = await repo.getTestSet(`course3-${slug}-understanding-check`);
      expect(set?.type).toBe("understanding-check");
      const qs = await repo.getQuestionsForTestSet(set!.id);
      expect(qs.map(q => q.correctAnswer)).toEqual(answers[i]);
      expect(qs.map(q => q.difficulty)).toEqual(["scaffold","scaffold","standard","standard","standard","standard","standard","challenge"]);
      expect(qs.filter(q => q.questionType === "numeric")).toHaveLength(4);
      expect(qs.filter(q => q.tags.includes("check-foundation"))).toHaveLength(2);
      expect(qs.filter(q => q.tags.includes("check-transfer"))).toHaveLength(3);
      expect(qs.filter(q => q.tags.includes("check-misconception"))).toHaveLength(2);
      expect(qs.every(q => !q.eligibleForMixed && !q.hint)).toBe(true);
      const slots = qs.filter(q => q.choices).map(q => q.choices!.findIndex(c => c.value === q.correctAnswer));
      expect([...slots].sort()).toEqual([0,1,2,3]);
      const normalize = (s: string) => s.toLowerCase().replace(/\d+(\.\d+)?/g,"#").replace(/\s+/g," ");
      const practice = (await repo.getQuestionsForConcept(`concept-${slug}`)).filter(q => !q.tags.some(t => t.startsWith("check-")));
      for (const q of qs) expect(practice.some(p => normalize(p.prompt) === normalize(q.prompt))).toBe(false);
    }
    expect(Math.round((Math.sqrt(13)+Math.sqrt(29))*10)/10).toBe(9);
    expect(Math.round(Math.sqrt(38)*10)/10).toBe(6.2);
    expect(2/9 - 0.222).toBeCloseTo(1/4500,12);
    expect(37/30 - 0.4).toBeCloseTo(5/6,12);
    expect((6e6*4-8e6)/8).toBe(2e6);
  });

  it("gates on delayed practice, preserves first answers through rapid saves and export/import, and isolates students", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-01T12:00:00Z"));
    const storage = new MemoryStorageService();
    const app = await createAppServices(storage);
    const profile = await app.studentProfileService.createProfile("Check pilot", "7", undefined, {profileType:"test"});
    await app.studentProfileService.setActiveStudent(profile.studentId);
    const set = (await app.contentRepository.getTestSet(id))!;
    expect(checkAvailability([],set).ready).toBe(false);
    await expect(app.testGenerationService.createConceptSession(concept,id)).rejects.toThrow("after practice");
    const practice = await app.testGenerationService.createConceptSession(concept);
    await app.sessionService.submitSession(practice.id);
    const before = await app.progressService.getConceptProgress(concept);
    vi.advanceTimersByTime(CHECK_DELAY_MS-1);
    await expect(app.testGenerationService.createConceptSession(concept,id)).rejects.toThrow("Available");
    vi.advanceTimersByTime(1);
    const session = await app.testGenerationService.createConceptSession(concept,id);
    expect((await app.testGenerationService.createConceptSession(concept,id)).id).toBe(session.id);
    const qs = await app.contentRepository.getQuestionsForTestSet(id);
    const num = qs[0], mc = qs[1];
    const save = (questionId: string,response: string,inputMethod:"text"|"choice",committed=false) => app.sessionService.saveAnswer(session.id,{questionId,response,inputMethod,committed,answeredAt:new Date().toISOString()});
    const operations = [save(num.id,"6","text"),save(num.id,"60","text"),save(num.id,"60","text",true),save(num.id,num.correctAnswer,"text"),save(num.id,num.correctAnswer,"text",true),save(mc.id,mc.choices!.find(c=>c.value!==mc.correctAnswer)!.value,"choice"),save(mc.id,mc.correctAnswer,"choice")];
    const submitted = app.sessionService.submitSession(session.id,"independent");
    await Promise.all(operations);
    const attempt = await submitted;
    expect(attempt.testSetId).toBe(id);
    expect(attempt.answerHistory?.[num.id].map(e=>e.response)).toEqual(["60",num.correctAnswer]);
    expect(attempt.answerHistory?.[mc.id]).toHaveLength(2);
    expect(attempt.summary.correctCount).toBe(2);
    const report = summarizeUnderstandingCheck(attempt,qs);
    expect(report).toMatchObject({observed:2,firstCorrect:0,daysSincePractice:7,support:"independent"});
    expect(summarizeUnderstandingCheck({...attempt,answerHistory:undefined},qs).observed).toBe(0);
    expect(await app.progressService.getConceptProgress(concept)).toEqual(before);
    await expect(app.testGenerationService.createConceptSession(concept,id)).rejects.toThrow("Completed");
    const snapshot = await app.dataTransferService.exportProgress();
    const restored = await createAppServices(new MemoryStorageService());
    await restored.dataTransferService.importProgress(JSON.parse(JSON.stringify(snapshot)));
    const imported = await restored.progressService.getAttempt(attempt.attemptId);
    expect(imported?.answerHistory).toEqual(attempt.answerHistory);
    expect(imported?.understandingCheck).toEqual(attempt.understandingCheck);
    expect(imported?.testSetId).toBe(id);
    const second = await app.studentProfileService.createProfile("Other pilot",undefined,undefined,{profileType:"test"});
    await app.studentProfileService.setActiveStudent(second.studentId);
    expect(await app.progressService.getAttempt(attempt.attemptId)).toBeNull();
    await expect(app.testGenerationService.createConceptSession(concept,id)).rejects.toThrow("after practice");
    expect((await storage.get<TestAttempt>(STORE_NAMES.attempts,getStudentScopedKey(profile.studentId,attempt.attemptId)))?.understandingCheck).toEqual(attempt.understandingCheck);
  });
});
