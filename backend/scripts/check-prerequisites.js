#!/usr/bin/env node
/**
 * Prerequisites Check Script
 * Verifies that all required dependencies are installed and configured
 */

const { execSync } = require('child_process');
const { existsSync } = require('fs');
const { join } = require('path');

const checks = {
  nodejs: { name: 'Node.js', command: 'node --version', minVersion: 18 },
  python: { name: 'Python', commands: ['python --version', 'python3 --version'], minVersion: 3.8 },
  ytdlp: { name: 'yt-dlp', command: 'yt-dlp --version', optional: false },
  ffmpeg: { name: 'FFmpeg', command: 'ffmpeg -version', optional: false },
  redis: { name: 'Redis', command: 'redis-cli ping', optional: true },
};

const results = {
  passed: [],
  failed: [],
  warnings: [],
};

function checkCommand(name, config) {
  try {
    // Handle multiple commands (for Python: python or python3)
    const commands = config.commands || [config.command];
    let output = null;
    let lastError = null;
    
    for (const cmd of commands) {
      try {
        output = execSync(cmd, { 
          encoding: 'utf-8', 
          stdio: ['pipe', 'pipe', 'ignore'] 
        }).trim();
        break; // Success, stop trying
      } catch (error) {
        lastError = error;
        continue; // Try next command
      }
    }
    
    if (!output) {
      throw lastError || new Error('Command failed');
    }
    
    // Version check for Node.js
    if (name === 'nodejs' && config.minVersion) {
      const version = output.match(/v?(\d+)/)?.[1];
      if (version && parseInt(version) < config.minVersion) {
        results.failed.push({
          name,
          message: `Found ${output}, but requires version ${config.minVersion}+`,
        });
        return false;
      }
    }
    
    // Version check for Python
    if (name === 'python' && config.minVersion) {
      const version = output.match(/(\d+)\.(\d+)/);
      if (version) {
        const major = parseInt(version[1]);
        const minor = parseInt(version[2]);
        const requiredMajor = Math.floor(config.minVersion);
        const requiredMinor = (config.minVersion % 1) * 10;
        
        if (major < requiredMajor || (major === requiredMajor && minor < requiredMinor)) {
          results.failed.push({
            name,
            message: `Found ${output}, but requires version ${config.minVersion}+`,
          });
          return false;
        }
      }
    }
    
    results.passed.push({ name, output });
    return true;
  } catch (error) {
    if (config.optional) {
      results.warnings.push({
        name,
        message: `${config.name} not found (optional - queue features will be disabled)`,
      });
    } else {
      results.failed.push({
        name,
        message: `${config.name} not found or not in PATH`,
      });
    }
    return false;
  }
}

function checkEnvFile() {
  const envPath = join(__dirname, '..', '.env');
  if (!existsSync(envPath)) {
    results.warnings.push({
      name: '.env',
      message: '.env file not found. Copy env.example to .env and configure it.',
    });
    return false;
  }
  results.passed.push({ name: '.env', output: 'Found' });
  return true;
}

// Run all checks
console.log('🔍 Checking prerequisites...\n');

for (const [key, config] of Object.entries(checks)) {
  checkCommand(key, config);
}

checkEnvFile();

// Print results
console.log('\n📊 Results:\n');

if (results.passed.length > 0) {
  console.log('✅ Passed:');
  results.passed.forEach(({ name, output }) => {
    console.log(`   ✓ ${name}: ${output}`);
  });
  console.log('');
}

if (results.warnings.length > 0) {
  console.log('⚠️  Warnings:');
  results.warnings.forEach(({ name, message }) => {
    console.log(`   ⚠ ${name}: ${message}`);
  });
  console.log('');
}

if (results.failed.length > 0) {
  console.log('❌ Failed:');
  results.failed.forEach(({ name, message }) => {
    console.log(`   ✗ ${name}: ${message}`);
  });
  console.log('');
  
  console.log('💡 Solutions:');
  results.failed.forEach(({ name }) => {
    switch (name) {
      case 'nodejs':
        console.log('   - Install Node.js 18+ from https://nodejs.org/');
        break;
      case 'python':
        console.log('   - Install Python 3.8+ from https://www.python.org/');
        console.log('   - Make sure Python is in your PATH');
        break;
      case 'ytdlp':
        console.log('   - Install: pip install yt-dlp');
        console.log('   - Or: pip3 install yt-dlp');
        break;
      case 'ffmpeg':
        console.log('   - Windows: Download from https://www.gyan.dev/ffmpeg/builds/');
        console.log('   - Linux: sudo apt-get install ffmpeg');
        console.log('   - Mac: brew install ffmpeg');
        break;
      case 'redis':
        console.log('   - Docker: docker run -d -p 6379:6379 --name yt-downloader-redis redis:7-alpine');
        console.log('   - Linux: sudo apt-get install redis-server (configure to use port 6379)');
        console.log('   - Mac: brew install redis (configure to use port 6379)');
        break;
    }
  });
  console.log('');
  
  process.exit(1);
}

if (results.warnings.length > 0 && results.failed.length === 0) {
  console.log('✅ All required dependencies are installed!');
  console.log('⚠️  Some optional dependencies are missing (see warnings above)');
  process.exit(0);
}

console.log('✅ All checks passed! You\'re ready to go! 🎉');
process.exit(0);

