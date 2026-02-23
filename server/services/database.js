/**
 * Database Service
 * Handles database connections (using Supabase)
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://qcrjhprkjygyvrzrhrkq.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

console.log('🔧 Database initialization:');
console.log('   SUPABASE_URL:', supabaseUrl ? '✓ configured' : '❌ missing');
console.log('   SUPABASE_KEY:', supabaseKey ? '✓ configured' : '❌ missing');

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Warning: Missing SUPABASE_URL or SUPABASE_KEY');
  console.warn('   Games API will return empty results');
}

let supabase = null;

try {
  supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test connection
  console.log('🔌 Testing Supabase connection...');
  supabase
    .from('users')
    .select('count(*)', { count: 'exact', head: true })
    .then(({ data, error, count }) => {
      if (error) {
        console.warn('⚠️ Supabase connection warning:', error.message || JSON.stringify(error));
      } else {
        console.log('✅ Supabase connected successfully');
      }
    })
    .catch(error => {
      console.warn('⚠️ Supabase connection check failed:', error.message || JSON.stringify(error));
    });
} catch (error) {
  console.warn('⚠️ Supabase initialization warning:', error.message);
  console.warn('   Games API will return empty results');
}

module.exports = supabase;
