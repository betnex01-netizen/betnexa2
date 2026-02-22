/**
 * Database Service
 * Handles database connections (using Supabase)
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'placeholder-anon-key';

let supabase = null;

try {
  supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test connection
  supabase
    .from('payments')
    .select('count(*)')
    .then(({ data, error }) => {
      if (error) {
        console.warn('Supabase connection warning:', error.message);
      } else {
        console.log('✅ Supabase connected successfully');
      }
    })
    .catch(error => {
      console.warn('⚠️ Supabase connection check failed:', error.message);
    });
} catch (error) {
  console.warn('⚠️ Supabase initialization warning:', error.message);
  supabase = null;
}

module.exports = supabase;
