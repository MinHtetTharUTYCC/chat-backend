const { execSync } = require('child_process');

console.log('Starting full build...');

try {
    console.log('1. Installing dependencies...');
    execSync('npm install --include=dev', { stdio: 'inherit' });

    console.log('2. Generating Prisma Client...');
    execSync('npx prisma generate', { stdio: 'inherit' });

    console.log('3. Building TypeScript...');
    execSync(
        'npx tsc --skipLibCheck --skipDefaultLibCheck -p tsconfig.build.json',
        { stdio: 'inherit' },
    );

    console.log('Build completed!');
} catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
}
