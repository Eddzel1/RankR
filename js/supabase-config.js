// Supabase Configuration
const SUPABASE_URL = 'https://jqgxzlvhmcwomkdeiryt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxZ3h6bHZobWN3b21rZGVpcnl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNDI5MTQsImV4cCI6MjA3MDcxODkxNH0.DTTDgG6Y9EXx6gXcxitRLUzLWR3-0Y6nndosiWd8xc0';

// The Supabase CDN v2 puts the library module on window.supabase
// We create the client instance and reassign window.supabase to it
// so all other scripts can simply reference "supabase" to get the client
const _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabase = _sb;
// Now 'supabase' in global scope refers to the client instance
const supabase = _sb;
