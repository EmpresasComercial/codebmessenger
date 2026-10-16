/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ptvmqurxtciyqxdpsuen.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0dm1xdXJ4dGNpeXF4ZHBzdWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MTMyMTEsImV4cCI6MjA5MjM4OTIxMX0.fAlsIBUdxU29-nEe3xAc4MCSgfQzwjbuPkRlwAFvSzc';

import { Database } from '../types/supabase';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    experimental: {
      passkey: true,
    },
  },
});
