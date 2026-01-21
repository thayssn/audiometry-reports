
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
    birth_date: Date;
    admission_date: Date;
    last_sequential_exam_date: Date;
    position: string;
    department: string;
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
    // Check Cache
    const cacheKey = `report_${reportId}`;
    const cached = this.getFromCache<Report>(cacheKey);
    if (cached) {
      toast.success("Relatório carregado do cache", {
        duration: 500,
      }); // Toast notification
      return cached;
    }

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (error) {
      console.error("Error fetching report:", error);
      return null;
    }

    if (!data) return null;

    const report = this.mapSupabaseReportToApp(data);

    // Set Cache
    this.setCache(cacheKey, report);

    return report;
  }

  async updateReport(reportId: string | number, report: Report): Promise<void> {
    // wrapper for saveReport
    const reportToSave = { ...report, id: reportId };
    await this.saveReport(reportToSave);
  }

  async deleteReport(reportId: string | number): Promise<void> {
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId);

    if (error) throw error;

    // Invalidate Cache
    this.invalidateCache(`report_${reportId}`);
  }

  async getAllReports(): Promise<Report[]> {
    const user = await authService.getCurrentUser();
    if (!user) return [];

    // Check Cache
    const cacheKey = `reports_list_${user.id}`;
    const cached = this.getFromCache<Report[]>(cacheKey);
    if (cached) return cached;

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('created_by', user.id) // FILTER BY USER
      .order('updated_at', { ascending: false });

    if (error) {
      console.error("Error fetching all reports:", error);
      return [];
    }

    const reports = data.map(val => this.mapSupabaseReportToApp(val));

    // Set Cache
    this.setCache(cacheKey, reports);

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

  async addReports(reports: Report[]): Promise<void> {
    // Batch insert
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not logged in');

    const payload = reports.map(r => ({
      created_by: user.id,
      identification: r.identification,
      history: r.history,
      results: r.results,
      conclusion: r.conclusion,
      recommendations: r.recommendations,
      created_at: r.created_at,
      updated_at: r.updated_at
    }));

    const { error } = await supabase
      .from('reports')
      .insert(payload);

    if (error) throw error;

    // Invalidate lists
    this.invalidateCache('');
  }

  async clearAllData(): Promise<void> {
    console.warn("clearAllData called - deleting all reports for this user");
    const { error } = await supabase.from('reports').delete().gt('id', 0);
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

    // Convert date strings back to Date objects
    if (identification.birth_date && typeof identification.birth_date === 'string') {
      identification.birth_date = new Date(identification.birth_date);
    }
    if (identification.admission_date && typeof identification.admission_date === 'string') {
      identification.admission_date = new Date(identification.admission_date);
    }
    if (identification.last_sequential_exam_date && typeof identification.last_sequential_exam_date === 'string') {
      identification.last_sequential_exam_date = new Date(identification.last_sequential_exam_date);
    }

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
