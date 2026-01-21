
import { supabase } from './supabase';

export interface UserProfile {
    id: string;
    username: string;
    name: string;
    crfa: string;
    logo_url?: string;
}

// Simple in-memory session management (plus localStorage)
const STORAGE_KEY = 'audiometry_user_session';

export const authService = {
    // Login: Check if username/password matches a row in 'profiles'
    async signInWithPassword(username: string, password: string) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', username)
            .eq('password', password) // Simple check
            .single();

        if (error || !data) {
            return { data: null, error: error || new Error('Invalid credentials') };
        }

        // Success - Save session
        this._saveSession(data);
        return { data: { user: data }, error: null };
    },

    async signOut() {
        localStorage.removeItem(STORAGE_KEY);
        // Force reload to clear state if needed, or just let router handle it
        return { error: null };
    },

    async getCurrentUser(): Promise<UserProfile | null> {
        // 1. Try memory/local storage first
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
        return null;
    },

    // Save user to local storage to persist login across refreshes
    _saveSession(user: UserProfile) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    },

    async updateProfile(userId: string, updates: Partial<UserProfile>) {
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (data) {
            // Update local session if we changed our own profile
            const current = await this.getCurrentUser();
            if (current && current.id === userId) {
                this._saveSession({ ...current, ...data });
            }
        }

        return { data, error };
    }
};
