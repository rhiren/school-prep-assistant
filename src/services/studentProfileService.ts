import type { StudentProfile } from "../domain/models";
import type { StudentProfileService } from "./contracts";
import { createId } from "../utils/id";
import { StudentProfileRepository } from "../storage/repositories";

export const DEFAULT_STUDENT_ID = "student-1";

function buildDefaultStudentProfile(): StudentProfile {
  const now = new Date().toISOString();
  return {
    studentId: DEFAULT_STUDENT_ID,
    displayName: "Student 1",
    createdAt: now,
    lastActiveAt: now,
    isActive: true,
  };
}

export class LocalStudentProfileService implements StudentProfileService {
  private initialized = false;

  constructor(private readonly repository: StudentProfileRepository) {}

  async listProfiles(): Promise<StudentProfile[]> {
    await this.ensureInitialized();
    return this.listSortedProfiles();
  }

  async getActiveProfile(): Promise<StudentProfile> {
    await this.ensureInitialized();
    const profiles = await this.listSortedProfiles();

    return profiles.find((profile) => profile.isActive) ?? profiles[0] ?? buildDefaultStudentProfile();
  }

  async getActiveStudentId(): Promise<string> {
    return (await this.getActiveProfile()).studentId;
  }

  async setActiveStudent(studentId: string): Promise<StudentProfile> {
    await this.ensureInitialized();
    const profiles = await this.listSortedProfiles();
    const target = profiles.find((profile) => profile.studentId === studentId);

    if (!target) {
      throw new Error(`Unknown student profile: ${studentId}`);
    }

    const now = new Date().toISOString();
    for (const profile of profiles) {
      await this.repository.save({
        ...profile,
        isActive: profile.studentId === studentId,
        lastActiveAt: profile.studentId === studentId ? now : profile.lastActiveAt,
      });
    }

    return {
      ...target,
      isActive: true,
      lastActiveAt: now,
    };
  }

  async createProfile(displayName: string, gradeLevel?: string): Promise<StudentProfile> {
    await this.ensureInitialized();

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      throw new Error("Student name is required.");
    }

    const now = new Date().toISOString();
    const profile: StudentProfile = {
      studentId: createId("student"),
      displayName: trimmedName,
      gradeLevel: gradeLevel?.trim() ? gradeLevel.trim() : undefined,
      createdAt: now,
      lastActiveAt: now,
      isActive: false,
    };

    await this.repository.save(profile);
    return profile;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const profiles = await this.repository.list();
    if (profiles.length === 0) {
      await this.repository.save(buildDefaultStudentProfile());
      this.initialized = true;
      return;
    }

    if (!profiles.some((profile) => profile.isActive)) {
      const [firstProfile] = [...profiles].sort((left, right) =>
        left.createdAt.localeCompare(right.createdAt),
      );
      if (firstProfile) {
        await this.repository.save({ ...firstProfile, isActive: true });
      }
    }

    this.initialized = true;
  }

  private async listSortedProfiles(): Promise<StudentProfile[]> {
    return [...(await this.repository.list())].sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    );
  }
}
