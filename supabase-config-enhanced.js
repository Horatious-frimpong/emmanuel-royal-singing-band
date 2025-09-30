// supabase-config-enhanced.js - FIXED
const getSupabaseConfig = () => {
  if (window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1')) {
    return {
      url: 'https://wfsryzanwgkvfrnaovac.supabase.co',
      key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indmc3J5emFud2drdmZybmFvdmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNTgxMTMsImV4cCI6MjA3NDczNDExM30.GaDhK9kOP_BXqsYDsHHbkHbYwQpjNYJGXMTM3xwYYN0'
    };
  }
  return {
    url: 'https://wfsryzanwgkvfrnaovac.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indmc3J5emFud2drdmZybmFvdmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNTgxMTMsImV4cCI6MjA3NDczNDExM30.GaDhK9kOP_BXqsYDsHHbkHbYwQpjNYJGXMTM3xwYYN0'
  };
};

const config = getSupabaseConfig();
const supabase = window.supabase.createClient(config.url, config.key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});