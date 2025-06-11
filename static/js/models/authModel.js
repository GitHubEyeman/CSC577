import { supabaseClient } from '../services/supabaseService.js';

export const AuthModel = {
  async checkAuth(redirectIfUnauthenticated = true) {
    try {
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('No active session');
      
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No user found');
      
      return user;
    } catch (error) {
      if (redirectIfUnauthenticated) window.location.href = 'login.html';
      return null;
    }
  },

  async login(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  async register(email, password) {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin }
    });
    if (error) throw error;
    return data;
  },

  async logout() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
  }
};