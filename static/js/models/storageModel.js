import { supabaseClient } from '../services/supabaseService.js';

export const StorageModel = {
  async uploadFile(bucket, filePath, file) {
    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .upload(filePath, file);
    if (error) throw error;
    return data;
  }
};