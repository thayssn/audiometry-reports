
import { supabase } from './supabase';
import { authService } from './authService';
import toast from 'solid-toast';

// Keep types compatible with existing code
export type YearResult = {
  year: string;
  result: string;
};

export type AppSettings = {
  logoUrl: string;
  signatureName: string;
  signatureCRFa: string;
};

export const DEFAULT_SETTINGS: AppSettings = {
  logoUrl: '/logo.png',
  signatureName: 'Ana Maria Carvalho de Oliveira',
  signatureCRFa: 'CRFa2 - 12.876'
};

export type Report = {
  id?: string | number;
  identification: {
    name: string;
    age: number;
    birth_date: string | null;            // ISO YYYY-MM-DD
    admission_date: string | null;        // ISO YYYY-MM-DD
    last_sequential_exam_date: string | null; // ISO YYYY-MM-DD
    position: string;
    department: string;
    base?: string;
  };
  history: string[];
  results: string[];
  conclusion: string;
  recommendations: string[];
  created_at?: string;
  updated_at: string;
  created_by?: string;
};

export const isReportComplete = (report: Report): boolean => {
  if (!report.identification.name || report.identification.name.trim() === '') return false;
  if (!report.identification.age || report.identification.age === 0) return false;
  if (!report.identification.birth_date || report.identification.birth_date === '') return false;
  if (!report.identification.admission_date || report.identification.admission_date === '') return false;
  if (!report.identification.last_sequential_exam_date || report.identification.last_sequential_exam_date === '') return false;
  if (!report.identification.position || report.identification.position.trim() === '') return false;
  if (!report.identification.department || report.identification.department.trim() === '') return false;

  if (!report.history || report.history.length === 0) return false;
  if (!report.results || report.results.length === 0) return false;
  if (!report.conclusion || report.conclusion.trim() === '') return false;
  if (!report.recommendations || report.recommendations.length === 0) return false;
  return true;
};

class DBService {
  // In-memory cache
  private cache = new Map<string, { data: any; timestamp: number }>();
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Init is now mostly a check for auth
  async init(): Promise<void> {
    const user = await authService.getCurrentUser();
    if (!user) {
      console.warn("DBService: No authenticated user found.");
    }
  }

  // --- Cache Helpers ---
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // Allow clearing cache externally (e.g. on login/logout)
  public clearCache(): void {
    this.cache.clear();
  }

  private invalidateCache(keyPrefix: string): void {
    if (keyPrefix) {
      this.cache.delete(keyPrefix);
    }

    // Always clear list cache on any update to ensure consistency
    this.cache.forEach((_, key) => {
      if (key.startsWith('reports_list') || key.startsWith('reports_count')) {
        this.cache.delete(key);
      }
    });
  }

  // Public method to clear cache (e.g. on logout)
  clearLocalCache(): void {
    this.cache.clear();
  }

  // --- Reports CRUD ---

  async saveReport(report: Report): Promise<number> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User must be logged in to save reports');

    // Prepare data for Supabase
    // Separate ID from data
    const { id, ...reportData } = report;

    // No date transformation needed, strings go as they are
    const dbPayload = {
      created_by: user.id,
      identification: report.identification,
      history: report.history,
      results: report.results,
      conclusion: report.conclusion,
      recommendations: report.recommendations,
      updated_at: new Date().toISOString()
    };

    if (report.created_at) {
      // @ts-ignore
      dbPayload.created_at = report.created_at;
    }

    let result;
    if (id) {
      // Update
      const { data, error } = await supabase
        .from('reports')
        .update(dbPayload)
        .eq('id', id)
        .eq('created_by', user.id) // Ensure user owns the report
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert
      const { data, error } = await supabase
        .from('reports')
        .insert(dbPayload)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    // Invalidate Cache for this specific report
    this.invalidateCache(`report_${result.id}`);

    return result.id;
  }

  async getReport(reportId: string | number): Promise<Report | null> {
    const user = await authService.getCurrentUser();

    // Cache disabled for full reports to ensure fresh data
    /*
    const cacheKey = `report_${reportId}`;
    const cached = this.getFromCache<Report>(cacheKey);
    if (cached) {
      toast.success("Relatório carregado do cache", {
        id: 'cache-hit',
        duration: 2000,
      }); 
      return cached;
    }
    */

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .eq('created_by', user?.id) // Filter by user
      .single();

    if (error) {
      console.error("Error fetching report:", error);
      return null;
    }

    if (!data) return null;

    const report = this.mapSupabaseReportToApp(data);

    // No caching
    // this.setCache(cacheKey, report);

    return report;
  }

  async updateReport(reportId: string | number, report: Report): Promise<void> {
    // wrapper for saveReport
    const reportToSave = { ...report, id: reportId };
    await this.saveReport(reportToSave);
  }

  async deleteReport(reportId: string | number): Promise<void> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not logged in');

    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId)
      .eq('created_by', user.id); // FILTER BY USER

    if (error) throw error;

    // Invalidate Cache
    this.invalidateCache(`report_${reportId}`);
  }

  async getAllReports(): Promise<Report[]> {
    const user = await authService.getCurrentUser();
    if (!user) return [];

    // Cache disabled for full list
    /*
    const cacheKey = `reports_list_${user.id}`;
    const cached = this.getFromCache<Report[]>(cacheKey);
    if (cached) return cached;
    */

    let allReports: any[] = [];
    let from = 0;
    const step = 1000;
    let keepFetching = true;

    while (keepFetching) {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('created_by', user.id) // FILTER BY USER
        .order('updated_at', { ascending: false })
        .range(from, from + step - 1);

      if (error) {
        console.error("Error fetching all reports:", error);
        return [];
      }

      if (data && data.length > 0) {
        allReports = [...allReports, ...data];
        // If we got fewer items than the step, we've reached the end
        if (data.length < step) {
          keepFetching = false;
        } else {
          from += step;
        }
      } else {
        keepFetching = false;
      }
    }

    const reports = allReports.map(val => this.mapSupabaseReportToApp(val));

    // this.setCache(cacheKey, reports);

    return reports;
  }

  async getReportsCount(): Promise<number> {
    const user = await authService.getCurrentUser();
    if (!user) return 0;

    const cacheKey = `reports_count_${user.id}`;
    const cached = this.getFromCache<number>(cacheKey);
    if (cached !== null) return cached;

    const { count, error } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', user.id); // FILTER BY USER

    if (error) return 0;
    const finalCount = count || 0;

    this.setCache(cacheKey, finalCount);
    return finalCount;
  }

  async getAllReportIds(): Promise<number[]> {
    const user = await authService.getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('reports')
      .select('id')
      .eq('created_by', user.id) // FILTER BY USER
      .order('id', { ascending: true });

    if (error) return [];
    return data.map(r => r.id);
  }

  async addReports(reports: Report[], updateExisting: boolean = false): Promise<string[]> {
    const notFoundNames: string[] = [];
    // Batch insert/update
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not logged in');

    if (updateExisting) {
      // 1. Fetch ALL existing reports for this user (id and name only) to build a map
      // This avoids N+1 queries.
      // Note: If user has 100k+ reports, we might need to batch this fetch too, but for now fetch all ID+Identity
      let allExisting: { id: string | number, identification: any }[] = [];

      // We can reuse getAllReports logic but lighter
      let from = 0;
      const step = 2000;
      let keepFetching = true;

      while (keepFetching) {
        const { data, error } = await supabase
          .from('reports')
          .select('id, identification')
          .eq('created_by', user.id)
          .range(from, from + step - 1);

        if (error || !data || data.length === 0) {
          keepFetching = false;
        } else {
          allExisting = [...allExisting, ...data];
          if (data.length < step) keepFetching = false;
          from += step;
        }
      }

      // 2. Build a Map for fast lookup: Name -> ExistingRecord
      // Normalize names to lowercase/trimmed/accent-free for better matching
      const normalizeKey = (str: string) => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      };

      const existingMap = new Map<string, typeof allExisting[0][]>();
      allExisting.forEach(r => {
        if (r.identification?.name) {
          const key = normalizeKey(r.identification.name);
          const currentList = existingMap.get(key) || [];
          currentList.push(r);
          existingMap.set(key, currentList);
        }
      });

      // 3. Prepare Bulk Updates
      const updates: any[] = [];

      const processedIds = new Set<string | number>();

      for (const report of reports) {
        const nameKey = normalizeKey(report.identification.name);
        const existingList = existingMap.get(nameKey);

        if (existingList && existingList.length > 0) {
          // Update ALL matching records for this user
          for (const existing of existingList) {
            // Prevent duplicate updates for the same ID in the same batch
            if (processedIds.has(existing.id)) {
              continue;
            }
            processedIds.add(existing.id);

            // FOUND: Update fields
            const incoming = report.identification;
            const current = existing.identification;

            const updatedIdentification = {
              ...current,
              base: incoming.base && incoming.base.trim() !== '' ? incoming.base : current.base,
              birth_date: incoming.birth_date ? incoming.birth_date : current.birth_date,
              admission_date: incoming.admission_date ? incoming.admission_date : current.admission_date,
              last_sequential_exam_date: incoming.last_sequential_exam_date ? incoming.last_sequential_exam_date : current.last_sequential_exam_date,
              position: incoming.position && incoming.position.trim() !== '' ? incoming.position : current.position,
              department: incoming.department && incoming.department.trim() !== '' ? incoming.department : current.department,
              age: incoming.age && incoming.age > 0 ? incoming.age : current.age
            };

            updates.push({
              id: existing.id,
              created_by: user.id, // REQUIRED for upsert
              identification: updatedIdentification,
              updated_at: new Date().toISOString()
            });
          }
        } else {
          // NOT FOUND
          const realName = report.identification.name.trim();
          notFoundNames.push(realName);
        }
      }

      // 4. Perform Batch Updates (Upsert style, but since we have IDs, it updates)
      // Supabase .upsert() is efficient.
      if (updates.length > 0) {
        // Upsert in chunks of 100 to avoid payload limits
        const chunkSize = 100;
        for (let i = 0; i < updates.length; i += chunkSize) {
          const chunk = updates.slice(i, i + chunkSize);
          const { error } = await supabase
            .from('reports')
            .upsert(chunk) // Upsert works because we included 'id'
            .select();     // Optional, just to verify

          if (error) {
            console.error('Batch update error:', error);
            // Verify if we should throw or continue
            throw error;
          }
        }
      }

    } else {

      // Standard batch insert (current logic)
      const payload = reports.map(r => {
        // No date formatting needed, pass strings directly
        return {
          created_by: user.id,
          identification: r.identification,
          history: r.history,
          results: r.results,
          conclusion: r.conclusion,
          recommendations: r.recommendations,
          created_at: r.created_at,
          updated_at: r.updated_at
        };
      });

      const { error } = await supabase
        .from('reports')
        .insert(payload);

      if (error) throw error;
    }

    // Invalidate lists
    this.invalidateCache('');

    return notFoundNames;
  }

  async clearAllData(): Promise<void> {
    console.warn("clearAllData called - deleting all reports for this user");
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not logged in');

    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('created_by', user.id); // FILTER BY USER

    if (error) throw error;

    this.cache.clear();
  }


  // --- Settings CRUD ---
  // Now merged into 'profiles' table

  async getSettings(): Promise<AppSettings> {
    const user = await authService.getCurrentUser();
    if (!user) return DEFAULT_SETTINGS;

    const cacheKey = `settings_${user.id}`;
    const cached = this.getFromCache<AppSettings>(cacheKey);
    if (cached) return cached;

    const { data: profile } = await supabase
      .from('profiles')
      .select('name, crfa, logo_url')
      .eq('id', user.id)
      .single();

    const settings = {
      logoUrl: profile?.logo_url || DEFAULT_SETTINGS.logoUrl,
      signatureName: profile?.name || DEFAULT_SETTINGS.signatureName,
      signatureCRFa: profile?.crfa || DEFAULT_SETTINGS.signatureCRFa
    };

    this.setCache(cacheKey, settings);
    return settings;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not logged in');

    // Update Profile (Name, CRFa, Logo)
    const { error } = await authService.updateProfile(user.id, {
      name: settings.signatureName,
      crfa: settings.signatureCRFa,
      logo_url: settings.logoUrl
    });

    if (error) throw error;

    this.invalidateCache(`settings_${user.id}`);
  }

  // Helper to map Supabase structure to App structure
  private mapSupabaseReportToApp(data: any): Report {
    const identification = data.identification || {};

    // NO parsing back to Date objects. Strings stay strings.

    return {
      id: data.id,
      identification: identification,
      history: data.history,
      results: data.results,
      conclusion: data.conclusion,
      recommendations: data.recommendations,
      created_at: data.created_at,
      updated_at: data.updated_at,
      created_by: data.created_by
    };
  }
}

export const dbService = new DBService();
