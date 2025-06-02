#!/usr/bin/env node

/**
 * Mosaiko Project Status Check
 * Verifica lo stato della configurazione del progetto
 */

const fs = require('fs');
const path = require('path');

console.log('🎯 Mosaiko Financial Dashboard - Project Status\n');

// Check essential files
const requiredFiles = [
  '.env.local',
  'src/lib/supabase.ts',
  'src/lib/auth.tsx',
  'src/lib/database.types.ts',
  'src/lib/database-service.ts',
  'src/app/page.tsx',
  'src/app/layout.tsx',
  'database/schema.sql'
];

console.log('📁 Checking Essential Files:');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
});

// Check environment variables
console.log('\n🔧 Environment Configuration:');
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const hasSupabaseUrl = envContent.includes('NEXT_PUBLIC_SUPABASE_URL=');
  const hasSupabaseKey = envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY=');
  
  console.log(`${hasSupabaseUrl ? '✅' : '❌'} NEXT_PUBLIC_SUPABASE_URL`);
  console.log(`${hasSupabaseKey ? '✅' : '❌'} NEXT_PUBLIC_SUPABASE_ANON_KEY`);
} else {
  console.log('❌ .env.local file not found');
}

// Check package.json dependencies
console.log('\n📦 Dependencies:');
if (fs.existsSync('package.json')) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const requiredDeps = [
    '@supabase/supabase-js',
    '@supabase/auth-helpers-nextjs',
    '@types/node',
    'typescript'
  ];
  
  requiredDeps.forEach(dep => {
    const installed = deps[dep] ? '✅' : '❌';
    console.log(`${installed} ${dep}`);
  });
}

console.log('\n🚀 Next Steps:');
console.log('1. Create database tables in Supabase using database/schema.sql');
console.log('2. Test authentication at http://localhost:3001');
console.log('3. Verify API connection at http://localhost:3001/api/test');
console.log('4. Start building your financial dashboard!');

console.log('\n📚 Documentation:');
console.log('- setup-database.md - Database setup instructions');
console.log('- SUPABASE_SETUP_COMPLETE.md - Complete setup overview');
console.log('- README.md - Project documentation');
