import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'backend/.env' });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('❌  SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const FIRST_ADMIN_EMAIL = process.env.FIRST_ADMIN_EMAIL || 'mnaser.tech@gmail.com';
const DUMMY_USER_ID = '00000000-0000-0000-0000-000000000001';

async function seed() {
  console.log(`🌱 Seeding first admin: ${FIRST_ADMIN_EMAIL}`);

  // 1. Check if user exists
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('❌  Failed to list users:', listError.message);
    process.exit(1);
  }

  let adminUser = usersData.users.find(u => u.email === FIRST_ADMIN_EMAIL);

  if (!adminUser) {
    console.log('👤 Creating auth user via Admin API...');
    // Create the user
    // Note: They will need to reset password or we can generate one. 
    // Usually admin uses a strong password or resets it via email.
    const { data: createdData, error: createError } = await supabase.auth.admin.createUser({
      email: FIRST_ADMIN_EMAIL,
      email_confirm: true,
      password: 'TemporaryPassword123!', // Admin can reset this later or login with it once
    });

    if (createError || !createdData.user) {
      console.error('❌  Failed to create user:', createError?.message);
      process.exit(1);
    }
    adminUser = createdData.user;
    console.log(`✅ Auth user created with ID: ${adminUser.id}`);
  } else {
    console.log(`✅ Auth user already exists with ID: ${adminUser.id}`);
  }

  // 2. Ensure they are admin in public.users table (trigger might have created them as 'user')
  console.log('👑 Promoting to admin...');
  const { error: updateRoleError } = await supabase
    .from('users')
    .update({ role: 'admin', email_verified_at: adminUser.email_confirmed_at })
    .eq('id', adminUser.id);

  if (updateRoleError) {
    console.error('❌  Failed to promote to admin:', updateRoleError.message);
    process.exit(1);
  }

  // 3. Migrate blogs
  console.log('🔄 Migrating blogs...');
  const { data: blogsMigrated, error: blogsError } = await supabase
    .from('blogs')
    .update({ user_id: adminUser.id })
    .eq('user_id', DUMMY_USER_ID)
    .select('id');

  if (blogsError) {
    console.error('❌  Failed to migrate blogs:', blogsError.message);
  } else {
    console.log(`✅ Migrated ${blogsMigrated?.length || 0} blogs to new admin`);
  }

  // 4. Migrate author profiles
  console.log('🔄 Migrating author profiles...');
  const { data: profilesMigrated, error: profilesError } = await supabase
    .from('author_profiles')
    .update({ user_id: adminUser.id })
    .eq('user_id', DUMMY_USER_ID)
    .eq('is_predefined', false)
    .select('id');

  if (profilesError) {
    console.error('❌  Failed to migrate profiles:', profilesError.message);
  } else {
    console.log(`✅ Migrated ${profilesMigrated?.length || 0} author profiles to new admin`);
  }

  console.log('🎉 Seed complete! First admin is ready.');
}

seed().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
