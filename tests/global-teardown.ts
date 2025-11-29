import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.test file
dotenv.config({ path: path.resolve(__dirname, '..', '.env.test') });

/**
 * Global teardown function for Playwright tests
 * Cleans up the Supabase database after all tests complete
 */
async function globalTeardown() {
  console.log('\n🧹 Running global teardown...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ SUPABASE_URL or SUPABASE_KEY not found in environment variables');
    console.error('   Make sure .env.test file exists with proper Supabase credentials');
    process.exit(1);
  }

  try {
    // Create Supabase client for cleanup operations
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
    });

    console.log('📡 Connected to Supabase');
    
    // Delete data in correct order due to ON DELETE RESTRICT constraints
    // 1. Delete instrument_value_changes (references instruments)
    const { error: valueChangesError, count: valueChangesCount } = await supabase
      .from('instrument_value_changes')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows (using impossible UUID)

    if (valueChangesError) {
      console.error('❌ Error cleaning up instrument_value_changes table:', valueChangesError.message);
      throw valueChangesError;
    }

    console.log(`✅ Cleaned up instrument_value_changes table (deleted ${valueChangesCount ?? 'all'} rows)`);

    // 2. Delete instruments (references wallets)
    const { error: instrumentsError, count: instrumentsCount } = await supabase
      .from('instruments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (instrumentsError) {
      console.error('❌ Error cleaning up instruments table:', instrumentsError.message);
      throw instrumentsError;
    }

    console.log(`✅ Cleaned up instruments table (deleted ${instrumentsCount ?? 'all'} rows)`);

    // 3. Delete wallets (parent table)
    const { error: walletsError, count: walletsCount } = await supabase
      .from('wallets')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (walletsError) {
      console.error('❌ Error cleaning up wallets table:', walletsError.message);
      throw walletsError;
    }

    console.log(`✅ Cleaned up wallets table (deleted ${walletsCount ?? 'all'} rows)`);
    
    console.log('✨ Global teardown completed successfully\n');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't exit with error code to avoid failing the test suite
    // The cleanup is best-effort
    console.log('⚠️  Continuing despite cleanup errors\n');
  }
}

export default globalTeardown;

