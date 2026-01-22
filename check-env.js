// Quick script to verify environment variables are set
// Run with: node check-env.js

const requiredVars = [
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
];

console.log('🔍 Checking environment variables...\n');

let allSet = true;
requiredVars.forEach((varName) => {
  const value = process.env[varName];
  if (value) {
    // Check for common issues
    if (value.startsWith(' ')) {
      console.log(`❌ ${varName}: Has leading space (remove space after =)`);
      allSet = false;
    } else if (value.length < 10) {
      console.log(`⚠️  ${varName}: Value seems too short`);
    } else {
      console.log(`✅ ${varName}: Set (${value.substring(0, 20)}...)`);
    }
  } else {
    console.log(`❌ ${varName}: NOT SET`);
    allSet = false;
  }
});

console.log('\n' + '='.repeat(50));
if (allSet) {
  console.log('✅ All environment variables are set!');
  console.log('\nNext steps:');
  console.log('1. Make sure you ran the Supabase schema (supabase/schema.sql)');
  console.log('2. Restart your dev server: npm run dev');
  console.log('3. Test by generating a deck');
} else {
  console.log('❌ Some environment variables are missing or have issues');
  console.log('Check your .env.local file');
}
