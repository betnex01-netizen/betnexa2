/**
 * Database Service
 * Handles database connections (using Supabase)
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://qcrjhprkjygyvrzrhrkq.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

let supabase = null;

try {
  supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test connection
  supabase
    .from('users')
    .select('count(*)', { count: 'exact', head: true })
    .then(({ data, error, count }) => {
      if (error) {
        console.warn('⚠️ Supabase connection warning:', error.message);
      } else {
        console.log('✅ Supabase connected successfully');
      }
    })
    .catch(error => {
      console.warn('⚠️ Supabase connection check failed:', error.message);
    });
} catch (error) {
  console.error('❌ Supabase initialization error:', error.message);
  process.exit(1);
}

module.exports = supabase;
