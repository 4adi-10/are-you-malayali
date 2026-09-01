import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wqvnnxjdaslngwfqoxhz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ew8XHLNTZnHAZmjGt9UZkQ_f4gKrvQf';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
