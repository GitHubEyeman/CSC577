import { supabaseClient } from '../services/supabaseService.js';

export const StorageModel = {
  async uploadFile(bucket, filePath, file) {
    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .upload(filePath, file, {
        upsert: false // Set to true if you want to overwrite existing files
      });
    
    if (error) throw error;
    return data;
  },
  
  // Add this new method to get user-specific files
  async getUserFiles(bucket, userId) {
    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .list(`user_${userId}`);
    
    if (error) throw error;
    return data;
  }
};