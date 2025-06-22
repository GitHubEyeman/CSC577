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

  async logout() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
  },
  
  async register(email, password, userData) {
    // First create auth user
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: userData.name // Store name in auth user metadata
        }
      }
    });
    
    if (authError) throw authError;

    // Then create profile in database
    const { data: profileData, error: profileError } = await supabaseClient
      .from('profiles') // Your table name
      .insert([{
        id: authData.user.id,
        email: email,
        full_name: userData.name,
        date_of_birth: userData.dob
      }])
      .select();
    
    if (profileError) throw profileError;

    return { authData, profileData };
  },

  async getProfile(userId) {
      const { data, error } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
      
      if (error) throw error;
      return data;
  },
  
  async updateProfile(userId, updates) {
    const { data, error } = await supabaseClient
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select();
    
    if (error) throw error;
    return data;
  },

  // In authModel.js or a new analysisModel.js
  async getAnalysisHistory(userId) {
      try {
          const { data, error } = await supabaseClient
              .from('analyses') // Your analyses table name
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false });
          
          if (error) throw error;
          return data;
      } catch (error) {
          console.error('Error fetching analysis history:', error);
          throw error;
      }
  },

  // Add these methods to your model
  async deleteAnalysis(analysisId) {
      try {
          const { error } = await supabaseClient
              .from('analyses')
              .delete()
              .eq('id', analysisId);
          
          if (error) throw error;
          return true;
      } catch (error) {
          console.error('Error deleting analysis:', error);
          throw error;
      }
  }


  





};