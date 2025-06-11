// Supabase Configuration Service
const supabaseUrl = 'https://fheoiypkkylzahkdinzp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoZW9peXBra3lsemFoa2RpbnpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2MDQwMTQsImV4cCI6MjA2MjE4MDAxNH0.Lt85eJC7wEX11tFHeiK3vPGNfzT9HGrQLPaPMBTTzeA';

export const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});