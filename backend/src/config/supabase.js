const { createClient } = require('@supabase/supabase-js');
let ws;
try {
  ws = require('ws');
} catch (e) {}
require('./env');

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const bucketName = process.env.SUPABASE_BUCKET_NAME || 'mayday-attachments';

let supabase = null;

if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-supabase-project')) {
  const options = {
    auth: { persistSession: false },
  };
  if (ws) {
    options.realtime = { transport: ws };
  }
  supabase = createClient(supabaseUrl, supabaseKey, options);
}

module.exports = {
  supabase,
  bucketName,
  isConfigured: () => Boolean(supabase),
};
