import type {
  PlacementLevel,
  PlacementProfile,
  StudentFeatureFlags,
  StudentProfile,
  StudentProfileType,
} from "../domain/models";
import type {
  StudentProfileDeletionSummary,
  StudentProfileService,
} from "./contracts";
import { createId } from "../utils/id";
import { getStudentScopedKey, STORE_NAMES, StudentProfileRepository } from "../storage/repositories";
import type { StorageService } from "../storage/storageService";

export const DEFAULT_STUDENT_ID = "student-1";
export const DEFAULT_PROFILE_TYPE: StudentProfileType = "production";

function normalizeOptionalText(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeFeatureFlags(
  featureFlags: StudentFeatureFlags | null | undefined,
): StudentFeatureFlags | undefined {
  if (!featureFlags) {
    return undefined;
  }

  const normalizedFlags = Object.fromEntries(
    Object.entries(featureFlags).filter(
      (entry): entry is [string, boolean] =>
        typeof entry[0] === "string" &&
        entry[0].trim().length > 0 &&
        typeof entry[1] === "boolean",
    ),
  );

  return Object.keys(normalizedFlags).length > 0 ? normalizedFlags : undefined;
}

function normalizeProfileType(
  profileType: StudentProfileType | string | null | undefined,
): StudentProfileType {
  return profileType === "test" ? "test" : DEFAULT_PROFILE_TYPE;
}

function normalizePlacementLevel(
  placement: PlacementLevel | null | undefined,
): PlacementLevel | undefined {
  if (!placement) {
    return undefined;
  }

  const instructionalGrade = normalizeOptionalText(placement.instructionalGrade);
  const programPathway = normalizeOptionalText(placement.programPathway);

  if (!instructionalGrade && !programPathway) {
    return undefined;
  }

  return {
    instructionalGrade,
    programPathway,
  };
}

function normalizePlacementProfile(
  placementProfile: PlacementProfile | null | undefined,
): PlacementProfile | undefined {
  if (!placementProfile) {
    return undefined;
  }

  const overall = normalizePlacementLevel(placementProfile.overall);
  const subjects = Object.fromEntries(
    Object.entries(placementProfile.subjects ?? {})
      .map(([subjectId, placement]) => [normalizeOptionalText(subjectId), normalizePlacementLevel(placement)])
      .filter(
        (entry): entry is [string, PlacementLevel] =>
          typeof entry[0] === "string" && typeof entry[1] !== "undefined",
      ),
  );

  if (!overall && Object.keys(subjects).length === 0) {
    return undefined;
  }

  return {
    overall,
    subjects: Object.keys(subjects).length > 0 ? subjects : undefined,
  };
}

export function normalizeStudentProfile(profile: StudentProfile): StudentProfile {
  const homeGrade = normalizeOptionalText(profile.homeGrade ?? profile.gradeLevel);

  return {
    ...profile,
    displayName: normalizeOptionalText(profile.displayName) ?? profile.displayName,
    gradeLevel: normalizeOptionalText(profile.gradeLevel),
    homeGrade,
    placementProfile: normalizePlacementProfile(profile.placementProfile),
    profileType: normalizeProfileType(profile.profileType),
    featureFlags: normalizeFeatureFlags(profile.featureFlags),
  };
}

function buildDefaultStudentProfile(): StudentProfile {
  const now = new Date().toISOString();
  return {
    studentId: DEFAULT_STUDENT_ID,
    displayName: "Student 1",
    createdAt: now,
    lastActiveAt: now,
    isActive: true,
    profileType: DEFAULT_PROFILE_TYPE,
  };
}

export class LocalStudentProfileService implements StudentProfileService {
  private initialized = false;

  constructor(
    private readonly repository: StudentProfileRepository,
    private readonly storage?: StorageService,
  ) {}

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

  async createProfile(
    displayName: string,
    homeGrade?: string,
    placementProfile?: PlacementProfile,
    options?: {
      profileType?: StudentProfileType;
      featureFlags?: StudentFeatureFlags;
    },
  ): Promise<StudentProfile> {
    await this.ensureInitialized();

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      throw new Error("Student name is required.");
    }

    const now = new Date().toISOString();
    const profile: StudentProfile = {
      studentId: createId("student"),
      displayName: trimmedName,
      homeGrade: normalizeOptionalText(homeGrade),
      placementProfile: normalizePlacementProfile(placementProfile),
      profileType: normalizeProfileType(options?.profileType),
      featureFlags: normalizeFeatureFlags(options?.featureFlags),
      createdAt: now,
      lastActiveAt: now,
      isActive: false,
    };

    const normalizedProfile = normalizeStudentProfile(profile);
    await this.repository.save(normalizedProfile);
    return normalizedProfile;
  }

  async isFeatureEnabled(studentId: string, featureName: string): Promise<boolean> {
    await this.ensureInitialized();

    const normalizedFeatureName = normalizeOptionalText(featureName);
    if (!normalizedFeatureName) {
      return false;
    }

    const profiles = await this.listSortedProfiles();
    const profile = profiles.find((item) => item.studentId === studentId);

    return Boolean(profile?.featureFlags?.[normalizedFeatureName]);
  }

  async convertProfileToTest(studentId: string): Promise<StudentProfile> {
    await this.ensureInitialized();

    const profiles = await this.listSortedProfiles();
    const profile = profiles.find((item) => item.studentId === studentId);

    if (!profile) {
      throw new Error(`Unknown student profile: ${studentId}`);
    }

    if (profile.profileType === "test") {
      return profile;
    }

    const updatedProfile = normalizeStudentProfile({
      ...profile,
      lastActiveAt: new Date().toISOString(),
      profileType: "test",
    });
    await this.repository.save(updatedProfile);
    return updatedProfile;
  }

  async setTestProfileFeatureFlag(
    studentId: string,
    featureName: string,
    enabled: boolean,
  ): Promise<StudentProfile> {
    await this.ensureInitialized();

    const normalizedFeatureName = normalizeOptionalText(featureName);
    if (!normalizedFeatureName) {
      throw new Error("Feature flag name is required.");
    }

    const profiles = await this.listSortedProfiles();
    const profile = profiles.find((item) => item.studentId === studentId);

    if (!profile) {
      throw new Error(`Unknown student profile: ${studentId}`);
    }

    if (profile.profileType !== "test") {
      throw new Error("Only test student profiles can change feature flags.");
    }

    const nextFeatureFlags = {
      ...(profile.featureFlags ?? {}),
      [normalizedFeatureName]: enabled,
    };
    const updatedProfile = normalizeStudentProfile({
      ...profile,
      lastActiveAt: new Date().toISOString(),
      featureFlags: nextFeatureFlags,
    });
    await this.repository.save(updatedProfile);
    return updatedProfile;
  }

  async upsertProfileFromCloud(profile: StudentProfile): Promise<StudentProfile> {
    await this.ensureInitialized();

    const existingProfile = (await this.listSortedProfiles()).find(
      (item) => item.studentId === profile.studentId,
    );
    const normalizedProfile = normalizeStudentProfile({
      ...profile,
      isActive: existingProfile?.isActive ?? profile.isActive,
    });
    await this.repository.save(normalizedProfile);
    return normalizedProfile;
  }

  async getProfileDeletionSummary(studentId: string): Promise<StudentProfileDeletionSummary> {
    await this.ensureInitialized();

    const profile = (await this.listSortedProfiles()).find((item) => item.studentId === studentId);
    if (!profile) {
      throw new Error(`Unknown student profile: ${studentId}`);
    }

    const sessions = await this.listStudentScopedRecords<{
      studentId: string;
      status?: string;
      currentQuestionIndex?: number;
      answers?: Record<string, { response?: string | null }>;
    }>(STORE_NAMES.sessions, studentId);
    const attempts = await this.listStudentScopedRecords<{ studentId: string }>(
      STORE_NAMES.attempts,
      studentId,
    );
    const progressRecords = await this.listStudentScopedRecords<{ studentId: string }>(
      STORE_NAMES.progress,
      studentId,
    );
    const inProgressSessionCount = sessions.filter((session) => {
      if (session.status !== "in_progress") {
        return false;
      }

      const answeredCount = Object.values(session.answers ?? {}).filter(
        (answer) => typeof answer?.response === "string" && answer.response.trim() !== "",
      ).length;
      return answeredCount > 0 || (session.currentQuestionIndex ?? 0) > 0;
    }).length;

    return {
      studentId: profile.studentId,
      displayName: profile.displayName,
      isActive: profile.isActive,
      hasSavedWork:
        attempts.length > 0 || progressRecords.length > 0 || inProgressSessionCount > 0,
      inProgressSessionCount,
      submittedAttemptCount: attempts.length,
      progressRecordCount: progressRecords.length,
    };
  }

  async deleteProfile(studentId: string): Promise<void> {
    await this.ensureInitialized();

    if (!this.storage) {
      throw new Error("Student profile deletion requires writable storage.");
    }

    const profiles = await this.listSortedProfiles();
    const profile = profiles.find((item) => item.studentId === studentId);

    if (!profile) {
      throw new Error(`Unknown student profile: ${studentId}`);
    }

    const remainingProfiles = profiles.filter((item) => item.studentId !== studentId);
    const nextActiveProfile =
      profile.isActive
        ? remainingProfiles.find((item) => item.profileType !== "test") ?? remainingProfiles[0] ?? null
        : null;

    await this.deleteStudentScopedRecords(STORE_NAMES.sessions, studentId);
    await this.deleteStudentScopedRecords(STORE_NAMES.attempts, studentId);
    await this.deleteStudentScopedRecords(STORE_NAMES.progress, studentId);
    await this.repository.delete(studentId);

    if (remainingProfiles.length === 0) {
      await this.repository.save(buildDefaultStudentProfile());
      return;
    }

    if (profile.isActive && nextActiveProfile) {
      await this.setActiveStudent(nextActiveProfile.studentId);
    }
  }

  async deleteTestProfile(studentId: string): Promise<void> {
    await this.ensureInitialized();

    if (!this.storage) {
      throw new Error("Student profile deletion requires writable storage.");
    }

    const profiles = await this.listSortedProfiles();
    const profile = profiles.find((item) => item.studentId === studentId);

    if (!profile) {
      throw new Error(`Unknown student profile: ${studentId}`);
    }

    if (profile.profileType !== "test") {
      throw new Error("Only test student profiles can be deleted.");
    }
    await this.deleteProfile(studentId);
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const profiles = await this.normalizeStoredProfiles();
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
    return [...(await this.normalizeStoredProfiles())].sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    );
  }

  private async normalizeStoredProfiles(): Promise<StudentProfile[]> {
    const profiles = await this.repository.list();
    const normalizedProfiles = profiles.map((profile) => normalizeStudentProfile(profile));

    for (let index = 0; index < profiles.length; index += 1) {
      if (JSON.stringify(profiles[index]) !== JSON.stringify(normalizedProfiles[index])) {
        await this.repository.save(normalizedProfiles[index]);
      }
    }

    return normalizedProfiles;
  }

  private async deleteStudentScopedRecords(
    storeName: typeof STORE_NAMES.sessions | typeof STORE_NAMES.attempts | typeof STORE_NAMES.progress,
    studentId: string,
  ): Promise<void> {
    if (!this.storage) {
      return;
    }

    const records = await this.storage.getAll<{ studentId?: string } & Record<string, unknown>>(storeName);
    for (const record of records) {
      if (record.studentId !== studentId) {
        continue;
      }

      const recordId =
        typeof record.id === "string"
          ? record.id
          : typeof record.attemptId === "string"
            ? record.attemptId
            : typeof record.conceptId === "string"
              ? record.conceptId
              : null;

      if (!recordId) {
        continue;
      }

      await this.storage.delete(storeName, getStudentScopedKey(studentId, recordId));
    }
  }

  private async listStudentScopedRecords<T extends { studentId: string }>(
    storeName: typeof STORE_NAMES.sessions | typeof STORE_NAMES.attempts | typeof STORE_NAMES.progress,
    studentId: string,
  ): Promise<T[]> {
    if (!this.storage) {
      return [];
    }

    return (await this.storage.getAll<T>(storeName)).filter((record) => record.studentId === studentId);
  }
}
