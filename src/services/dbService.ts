// IndexedDB Service for managing audiometric reports

const DB_NAME = 'audiometric-reports';
const DB_VERSION = 6; // Incremented to simplify results from YearResult[] to string[]
const REPORTS_STORE = 'reports';
const SETTINGS_STORE = 'settings';

export type YearResult = {
  year: string;
  result: string;
};

export type AppSettings = {
  logoUrl: string;
  signatureName: string;
  signatureCRFa: string;
  examinerName: string;
  examinerCRFa: string;
};

export const DEFAULT_SETTINGS: AppSettings = {
  logoUrl: '/logo.png',
  signatureName: 'Ana Maria Carvalho de Oliveira',
  signatureCRFa: 'CRFa2 - 12.876',
  examinerName: '',
  examinerCRFa: ''
};

// IMPORTANT: When adding identification fields, update src/config/fields.ts first
// Then sync this identification structure with the config
export type Report = {
  id?: string | number;
  identification: {
    name: string;
    age: number;
    birth_date: Date;
    admission_date: Date;
    last_sequential_exam_date: Date;
    position: string;
    department: string;
  };
  examiner: {
    name: string;
    crfa: string;
  };
  history: string[];
  results: string[]; // Simplified: "2023 - Texto do resultado"
  conclusion: string;
  recommendations: string[];
  created_at?: string;
  updated_at: string;
};

// Helper function to check if a report is complete
export const isReportComplete = (report: Report): boolean => {
  // Check identification fields
  if (!report.identification.name || report.identification.name.trim() === '') return false;
  if (!report.identification.position || report.identification.position.trim() === '') return false;
  if (!report.identification.department || report.identification.department.trim() === '') return false;
  
  // Check if has at least one history item
  if (!report.history || report.history.length === 0) return false;
  
  // Check if has at least one result
  if (!report.results || report.results.length === 0) return false;
  
  // Check conclusion
  if (!report.conclusion || report.conclusion.trim() === '') return false;
  
  // Check if has at least one recommendation
  if (!report.recommendations || report.recommendations.length === 0) return false;
  
  return true;
};

class DBService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Remove old patients store if it exists
        if (db.objectStoreNames.contains('patients')) {
          db.deleteObjectStore('patients');
        }

        // Create or recreate reports store
        if (db.objectStoreNames.contains(REPORTS_STORE)) {
          db.deleteObjectStore(REPORTS_STORE);
        }
        
        const reportsStore = db.createObjectStore(REPORTS_STORE, { keyPath: 'id', autoIncrement: true });
        reportsStore.createIndex('name', ['identification', 'name'], { unique: false });
        reportsStore.createIndex('created_at', 'created_at', { unique: false });
        reportsStore.createIndex('updated_at', 'updated_at', { unique: false });

        // Create settings store
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          db.createObjectStore(SETTINGS_STORE, { keyPath: 'id' });
        }
      };
    });

    return this.initPromise;
  }

  // CRUD Relatórios
  async saveReport(report: Report): Promise<number> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([REPORTS_STORE], 'readwrite');
      const store = transaction.objectStore(REPORTS_STORE);
      
      const reportToSave = {
        ...report,
        created_at: report.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      let request: IDBRequest;
      
      if (report.id) {
        // Update existing report - convert to number
        const id = typeof report.id === 'string' ? parseInt(report.id as string) : report.id;
        reportToSave.id = id;
        request = store.put(reportToSave);
      } else {
        // Create new report - remove undefined id field
        const { id, ...reportWithoutId } = reportToSave;
        request = store.add(reportWithoutId);
      }

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getReport(reportId: string | number): Promise<Report | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([REPORTS_STORE], 'readonly');
      const store = transaction.objectStore(REPORTS_STORE);
      // Convert string to number if needed since autoIncrement uses numbers
      const id = typeof reportId === 'string' ? parseInt(reportId) : reportId;
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async updateReport(reportId: string | number, report: Report): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([REPORTS_STORE], 'readwrite');
      const store = transaction.objectStore(REPORTS_STORE);
      
      // Convert string to number if needed
      const id = typeof reportId === 'string' ? parseInt(reportId) : reportId;
      
      const reportToUpdate = {
        ...report,
        id: id,
        updated_at: new Date().toISOString()
      };

      const request = store.put(reportToUpdate);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteReport(reportId: string | number): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([REPORTS_STORE], 'readwrite');
      const store = transaction.objectStore(REPORTS_STORE);
      // Convert string to number if needed
      const id = typeof reportId === 'string' ? parseInt(reportId) : reportId;
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllReports(): Promise<Report[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([REPORTS_STORE], 'readonly');
      const store = transaction.objectStore(REPORTS_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getReportsCount(): Promise<number> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([REPORTS_STORE], 'readonly');
      const store = transaction.objectStore(REPORTS_STORE);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllReportIds(): Promise<number[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([REPORTS_STORE], 'readonly');
      const store = transaction.objectStore(REPORTS_STORE);
      const request = store.getAllKeys();

      request.onsuccess = () => {
        const ids = (request.result as number[]).sort((a, b) => a - b);
        resolve(ids);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addReports(reports: Report[]): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([REPORTS_STORE], 'readwrite');
      const store = transaction.objectStore(REPORTS_STORE);

      reports.forEach(report => {
        const reportToAdd = {
          ...report,
          created_at: report.created_at || new Date().toISOString(),
          updated_at: report.updated_at || new Date().toISOString()
        };
        const { id, ...reportWithoutId } = reportToAdd;
        store.add(reportWithoutId);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async clearAllData(): Promise<void> {
    // Close any existing connection first
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }

    // Delete the entire database to reset autoIncrement
    return new Promise((resolve, reject) => {
      console.log('Attempting to delete database:', DB_NAME);
      const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
      
      deleteRequest.onsuccess = () => {
        console.log('✅ Database deleted successfully! AutoIncrement counter reset.');
        // Reinitialize the database (creates a fresh one)
        this.init().then(() => {
          console.log('✅ Fresh database initialized. Next ID will be 1.');
          resolve();
        }).catch(reject);
      };
      
      deleteRequest.onerror = (event) => {
        console.error('❌ Database deletion failed:', event);
        reject(deleteRequest.error);
      };
      
      deleteRequest.onblocked = (event) => {
        console.error('⚠️ Database deletion BLOCKED! There are open connections.');
        console.error('This usually means the database is open in another tab or window.');
        console.error('Please close all other tabs with this app and try again.');
        
        // Reject instead of trying to continue with a corrupted state
        reject(new Error('Database deletion blocked. Please close all other tabs with this app and try again.'));
      };
    });
  }

  // Settings CRUD
  async getSettings(): Promise<AppSettings> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SETTINGS_STORE], 'readonly');
      const store = transaction.objectStore(SETTINGS_STORE);
      const request = store.get('app-settings');

      request.onsuccess = () => {
        const settings = request.result;
        resolve(settings || DEFAULT_SETTINGS);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SETTINGS_STORE], 'readwrite');
      const store = transaction.objectStore(SETTINGS_STORE);
      const settingsToSave = {
        id: 'app-settings',
        ...settings
      };
      const request = store.put(settingsToSave);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const dbService = new DBService();

