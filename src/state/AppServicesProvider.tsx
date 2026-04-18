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
import { createDefaultContentRepository } from "../services/contentRepository";
import { DataTransferService } from "../services/dataTransferService";
import {
  DEFAULT_PROGRESS_SYNC_USER_ID,
  FirestoreProgressSyncClient,
  ProgressSyncManager,
  type ProgressSyncStatus,
  SyncingDataTransferService,
  SyncingProgressService,
} from "../services/firebaseProgressSync";
import { LocalProgressService } from "../services/progressService";
import { LocalSessionService } from "../services/sessionService";
import { IndexedDBStorageService } from "../storage/indexedDbStorageService";
import { MemoryStorageService } from "../storage/memoryStorageService";
import {
  AttemptRepository,
  ProgressRepository,
  SessionRepository,
} from "../storage/repositories";
import type { StorageService } from "../storage/storageService";
import type {
  ContentRepository,
  DataTransferServiceContract,
  MixedTestService,
  ProgressService,
  SessionService,
  TestGenerationService,
} from "../services/contracts";

export interface AppServices {
  contentRepository: ContentRepository;
  testGenerationService: TestGenerationService;
  sessionService: SessionService;
  progressService: ProgressService;
  mixedTestService: MixedTestService;
  dataTransferService: DataTransferServiceContract;
  progressSyncManager?: ProgressSyncManager;
}

const AppServicesContext = createContext<AppServices | null>(null);
const ProgressSyncStatusContext = createContext<ProgressSyncStatus>("offline");

interface CreateAppServicesOptions {
  progressSyncManager?: ProgressSyncManager;
}

export async function createAppServices(
  store: StorageService = new MemoryStorageService(),
  options: CreateAppServicesOptions = {},
): Promise<AppServices> {
  const contentRepository = await createDefaultContentRepository();
  const sessionRepository = new SessionRepository(store);
  const attemptRepository = new AttemptRepository(store);
  const progressRepository = new ProgressRepository(store);
  const localProgressService = new LocalProgressService(attemptRepository, progressRepository);
  const progressService = options.progressSyncManager
    ? new SyncingProgressService(localProgressService, options.progressSyncManager)
    : localProgressService;
  const scoringService = new BasicScoringEngine(contentRepository);
  const sessionService = new LocalSessionService(
    sessionRepository,
    attemptRepository,
    scoringService,
    progressService,
  );
  const selectionStrategy = new StableSelectionStrategy();
  const testGenerationService = new DeterministicConceptTestEngine(
    contentRepository,
    sessionRepository,
    selectionStrategy,
  );
  const mixedTestService = new MixedTestEligibilityEngine(progressService);
  const localDataTransferService = new DataTransferService(store);
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
    progressSyncManager: options.progressSyncManager,
  };
}

async function createDefaultAppServices(): Promise<AppServices> {
  const store = await IndexedDBStorageService.create();
  const progressSyncManager = new ProgressSyncManager(
    new FirestoreProgressSyncClient(),
    new DataTransferService(store),
    DEFAULT_PROGRESS_SYNC_USER_ID,
  );
  const services = await createAppServices(store, { progressSyncManager });
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

  const resolvedServices = useMemo(() => services, [services]);

  if (!resolvedServices) {
    return <div className="app-shell"><div className="panel panel-padding">Loading app data...</div></div>;
  }

  return (
    <ProgressSyncStatusContext.Provider value={syncStatus}>
      <AppServicesContext.Provider value={resolvedServices}>
        {children}
      </AppServicesContext.Provider>
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
