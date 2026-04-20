import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { BasicScoringEngine } from "../engines/basicScoringEngine";
import { DeterministicConceptTestEngine } from "../engines/deterministicConceptTestEngine";
import { MixedTestEligibilityEngine } from "../engines/mixedTestEligibilityEngine";
import { StableSelectionStrategy } from "../engines/questionSelectionStrategy";
import type {
  PlacementProfile,
  StudentFeatureFlags,
  StudentProfile,
  StudentProfileType,
} from "../domain/models";
import { createDefaultContentRepository } from "../services/contentRepository";
import { DataTransferService } from "../services/dataTransferService";
import {
  FirestoreProgressSyncClient,
  ProgressSyncManager,
  SyncingSessionService,
  type ProgressSyncStatus,
  SyncingDataTransferService,
  SyncingProgressService,
} from "../services/firebaseProgressSync";
import { LocalProgressService } from "../services/progressService";
import { LocalSessionService } from "../services/sessionService";
import { LocalStudentProfileService } from "../services/studentProfileService";
import { IndexedDBStorageService } from "../storage/indexedDbStorageService";
import { MemoryStorageService } from "../storage/memoryStorageService";
import {
  AttemptRepository,
  ProgressRepository,
  SessionRepository,
  StudentProfileRepository,
} from "../storage/repositories";
import type { StorageService } from "../storage/storageService";
import type {
  ContentRepository,
  DataTransferServiceContract,
  MixedTestService,
  ProgressService,
  SessionService,
  StudentProfileService,
  TestGenerationService,
} from "../services/contracts";

export interface AppServices {
  contentRepository: ContentRepository;
  testGenerationService: TestGenerationService;
  sessionService: SessionService;
  progressService: ProgressService;
  mixedTestService: MixedTestService;
  dataTransferService: DataTransferServiceContract;
  studentProfileService: StudentProfileService;
  progressSyncManager?: ProgressSyncManager;
}

const AppServicesContext = createContext<AppServices | null>(null);
const ProgressSyncStatusContext = createContext<ProgressSyncStatus>("offline");
interface StudentProfilesContextValue {
  profiles: StudentProfile[];
  activeProfile: StudentProfile | null;
  setActiveStudent: (studentId: string) => Promise<void>;
  createStudentProfile: (
    displayName: string,
    homeGrade?: string,
    placementProfile?: PlacementProfile,
    options?: {
      profileType?: StudentProfileType;
      featureFlags?: StudentFeatureFlags;
    },
  ) => Promise<void>;
  convertStudentProfileToTest: (studentId: string) => Promise<void>;
  setTestStudentFeatureFlag: (studentId: string, featureName: string, enabled: boolean) => Promise<void>;
  deleteTestStudentProfile: (studentId: string) => Promise<void>;
}

const StudentProfilesContext = createContext<StudentProfilesContextValue | null>(null);

interface CreateAppServicesOptions {
  progressSyncManager?: ProgressSyncManager;
  studentProfileService?: StudentProfileService;
}

export async function createAppServices(
  store: StorageService = new MemoryStorageService(),
  options: CreateAppServicesOptions = {},
): Promise<AppServices> {
  const contentRepository = await createDefaultContentRepository();
  const studentProfileService =
    options.studentProfileService ??
    new LocalStudentProfileService(new StudentProfileRepository(store), store);
  const sessionRepository = new SessionRepository(store, studentProfileService);
  const attemptRepository = new AttemptRepository(store, studentProfileService);
  const progressRepository = new ProgressRepository(store, studentProfileService);
  const localProgressService = new LocalProgressService(attemptRepository, progressRepository);
  const progressService = options.progressSyncManager
    ? new SyncingProgressService(localProgressService, options.progressSyncManager)
    : localProgressService;
  const scoringService = new BasicScoringEngine(contentRepository);
  const localSessionService = new LocalSessionService(
    sessionRepository,
    attemptRepository,
    scoringService,
    progressService,
  );
  const sessionService = options.progressSyncManager
    ? new SyncingSessionService(localSessionService, options.progressSyncManager)
    : localSessionService;
  const selectionStrategy = new StableSelectionStrategy();
  const testGenerationService = new DeterministicConceptTestEngine(
    contentRepository,
    sessionRepository,
    selectionStrategy,
    studentProfileService,
  );
  const mixedTestService = new MixedTestEligibilityEngine(progressService);
  const localDataTransferService = new DataTransferService(store, studentProfileService);
  const dataTransferService = options.progressSyncManager
    ? new SyncingDataTransferService(localDataTransferService, options.progressSyncManager)
    : localDataTransferService;

  return {
    contentRepository,
    testGenerationService,
    sessionService,
    progressService,
    mixedTestService,
    dataTransferService,
    studentProfileService,
    progressSyncManager: options.progressSyncManager,
  };
}

async function createDefaultAppServices(): Promise<AppServices> {
  const store = await IndexedDBStorageService.create();
  const studentProfileServiceWithStorage = new LocalStudentProfileService(
    new StudentProfileRepository(store),
    store,
  );
  const progressSyncManager = new ProgressSyncManager(
    new FirestoreProgressSyncClient(),
    new DataTransferService(store, studentProfileServiceWithStorage),
    () => studentProfileServiceWithStorage.getActiveStudentId(),
  );
  const services = await createAppServices(store, {
    progressSyncManager,
    studentProfileService: studentProfileServiceWithStorage,
  });
  await progressSyncManager.initialize();
  return services;
}

export function AppServicesProvider({
  children,
  services: providedServices,
}: PropsWithChildren<{ services?: AppServices }>) {
  const [services, setServices] = useState<AppServices | null>(providedServices ?? null);
  const [syncStatus, setSyncStatus] = useState<ProgressSyncStatus>(
    providedServices?.progressSyncManager?.getStatus() ?? "offline",
  );
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<StudentProfile | null>(null);

  useEffect(() => {
    if (providedServices) {
      setServices(providedServices);
      setSyncStatus(providedServices.progressSyncManager?.getStatus() ?? "offline");
      return;
    }

    let isMounted = true;
    void createDefaultAppServices().then((initializedServices) => {
      if (isMounted) {
        setServices(initializedServices);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [providedServices]);

  useEffect(() => {
    if (!services?.progressSyncManager) {
      setSyncStatus("offline");
      return;
    }

    return services.progressSyncManager.subscribe(setSyncStatus);
  }, [services]);

  useEffect(() => {
    if (!services) {
      setProfiles([]);
      setActiveProfile(null);
      return;
    }

    let isMounted = true;
    void services.studentProfileService.listProfiles().then((loadedProfiles) => {
      if (isMounted) {
        setProfiles(loadedProfiles);
      }
    });
    void services.studentProfileService.getActiveProfile().then((profile) => {
      if (isMounted) {
        setActiveProfile(profile);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [services]);

  const resolvedServices = useMemo(() => services, [services]);
  const studentProfilesValue = useMemo<StudentProfilesContextValue | null>(() => {
    if (!resolvedServices) {
      return null;
    }

    return {
      profiles,
      activeProfile,
      setActiveStudent: async (studentId: string) => {
        const profile = await resolvedServices.studentProfileService.setActiveStudent(studentId);
        setActiveProfile(profile);
        setProfiles(await resolvedServices.studentProfileService.listProfiles());
        await resolvedServices.progressSyncManager?.initialize();
      },
      createStudentProfile: async (
        displayName: string,
        homeGrade?: string,
        placementProfile?: PlacementProfile,
        options?: {
          profileType?: StudentProfileType;
          featureFlags?: StudentFeatureFlags;
        },
      ) => {
        await resolvedServices.studentProfileService.createProfile(
          displayName,
          homeGrade,
          placementProfile,
          options,
        );
        setProfiles(await resolvedServices.studentProfileService.listProfiles());
      },
      convertStudentProfileToTest: async (studentId: string) => {
        const updatedProfile = await resolvedServices.studentProfileService.convertProfileToTest(
          studentId,
        );
        setProfiles(await resolvedServices.studentProfileService.listProfiles());
        if (updatedProfile.isActive) {
          setActiveProfile(updatedProfile);
        }
      },
      setTestStudentFeatureFlag: async (studentId: string, featureName: string, enabled: boolean) => {
        const updatedProfile = await resolvedServices.studentProfileService.setTestProfileFeatureFlag(
          studentId,
          featureName,
          enabled,
        );
        setProfiles(await resolvedServices.studentProfileService.listProfiles());
        if (updatedProfile.isActive) {
          setActiveProfile(updatedProfile);
        }
      },
      deleteTestStudentProfile: async (studentId: string) => {
        await resolvedServices.studentProfileService.deleteTestProfile(studentId);
        const refreshedProfiles = await resolvedServices.studentProfileService.listProfiles();
        setProfiles(refreshedProfiles);
        setActiveProfile(await resolvedServices.studentProfileService.getActiveProfile());
        await resolvedServices.progressSyncManager?.initialize();
      },
    };
  }, [activeProfile, profiles, resolvedServices]);

  if (!resolvedServices) {
    return <div className="app-shell"><div className="panel panel-padding">Loading app data...</div></div>;
  }

  return (
    <ProgressSyncStatusContext.Provider value={syncStatus}>
      <StudentProfilesContext.Provider value={studentProfilesValue}>
        <AppServicesContext.Provider value={resolvedServices}>
          {children}
        </AppServicesContext.Provider>
      </StudentProfilesContext.Provider>
    </ProgressSyncStatusContext.Provider>
  );
}

export function useAppServices(): AppServices {
  const value = useContext(AppServicesContext);
  if (!value) {
    throw new Error("AppServicesProvider is missing.");
  }

  return value;
}

export function useProgressSyncStatus(): ProgressSyncStatus {
  return useContext(ProgressSyncStatusContext);
}

export function useStudentProfiles(): StudentProfilesContextValue {
  const value = useContext(StudentProfilesContext);
  if (!value) {
    throw new Error("StudentProfilesContext is missing.");
  }

  return value;
}
