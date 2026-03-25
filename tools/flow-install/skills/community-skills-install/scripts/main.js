#!/usr/bin/env node

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMMUNITY_REPO = 'https://github.com/sickn33/antigravity-awesome-skills.git';
const COMMUNITY_DIR = path.join(os.homedir(), 'antigravity-skills');
const INSTALL_DIR = path.join(os.homedir(), '.agents', 'skills');
const COMMUNITY_METADATA_PATH = path.join(os.homedir(), '.agents', 'community-install.json');
const CATALOG_PATH = path.join(__dirname, '..', '..', '..', '.jarvis', 'context', 'skills', '_catalog.md');

const BUNDLES = {
  'Essentials': ['concise-planning', 'lint-and-validate', 'git-pushing', 'kaizen', 'systematic-debugging'],
  'Security Engineer': ['ethical-hacking-methodology', 'burp-suite-testing', 'top-web-vulnerabilities', 'linux-privilege-escalation', 'cloud-penetration-testing', 'security-auditor', 'vulnerability-scanner'],
  'Security Developer': ['api-security-best-practices', 'auth-implementation-patterns', 'backend-security-coder', 'frontend-security-coder', 'cc-skill-security-review', 'pci-compliance'],
  'Web Wizard': ['frontend-design', 'react-best-practices', 'react-patterns', 'nextjs-best-practices', 'tailwind-patterns', 'form-cro', 'seo-audit'],
  'Web Designer': ['ui-ux-pro-max', 'frontend-design', '3d-web-experience', 'canvas-design', 'mobile-design', 'scroll-experience'],
  'Full-Stack Developer': ['senior-fullstack', 'frontend-developer', 'backend-dev-guidelines', 'api-patterns', 'database-design', 'stripe-integration'],
  'Agent Architect': ['agent-evaluation', 'langgraph', 'mcp-builder', 'prompt-engineering', 'ai-agents-architect', 'rag-engineer'],
  'LLM Application Developer': ['llm-app-patterns', 'rag-implementation', 'prompt-caching', 'context-window-management', 'langfuse'],
  'Indie Game Dev': ['game-development/game-design', 'game-development/2d-games', 'game-development/3d-games', 'unity-developer', 'godot-gdscript-patterns', 'algorithmic-art'],
  'Python Pro': ['python-pro', 'python-patterns', 'fastapi-pro', 'fastapi-templates', 'django-pro', 'python-testing-patterns', 'async-python-patterns'],
  'TypeScript & JavaScript': ['typescript-expert', 'javascript-pro', 'react-best-practices', 'nodejs-best-practices', 'nextjs-app-router-patterns'],
  'Systems Programming': ['rust-pro', 'go-concurrency-patterns', 'golang-pro', 'memory-safety-patterns', 'cpp-pro'],
  'Startup Founder': ['product-manager-toolkit', 'competitive-landscape', 'competitor-alternatives', 'launch-strategy', 'copywriting', 'stripe-integration'],
  'Business Analyst': ['business-analyst', 'startup-metrics-framework', 'startup-financial-modeling', 'market-sizing-analysis', 'kpi-dashboard-design'],
  'Marketing & Growth': ['content-creator', 'seo-audit', 'programmatic-seo', 'analytics-tracking', 'ab-test-setup', 'email-sequence'],
  'DevOps & Cloud': ['docker-expert', 'aws-serverless', 'kubernetes-architect', 'terraform-specialist', 'environment-setup-guide', 'deployment-procedures', 'bash-linux'],
  'Observability & Monitoring': ['observability-engineer', 'distributed-tracing', 'slo-implementation', 'incident-responder', 'postmortem-writing', 'performance-engineer'],
  'Data & Analytics': ['analytics-tracking', 'claude-d3js-skill', 'sql-pro', 'postgres-best-practices', 'ab-test-setup', 'database-architect'],
  'Data Engineering': ['data-engineer', 'airflow-dag-patterns', 'dbt-transformation-patterns', 'vector-database-engineer', 'embedding-strategies'],
  'Creative Director': ['canvas-design', 'frontend-design', 'content-creator', 'copy-editing', 'algorithmic-art', 'interactive-portfolio'],
  'QA & Testing': ['test-driven-development', 'systematic-debugging', 'browser-automation', 'e2e-testing-patterns', 'ab-test-setup', 'code-review-checklist', 'test-fixing'],
  'Mobile Developer': ['mobile-developer', 'react-native-architecture', 'flutter-expert', 'ios-developer', 'app-store-optimization'],
  'Integration & APIs': ['stripe-integration', 'twilio-communications', 'hubspot-integration', 'plaid-fintech', 'algolia-search'],
  'Architecture & Design': ['senior-architect', 'architecture-patterns', 'microservices-patterns', 'event-sourcing-architect', 'architecture-decision-records'],
  'DDD & Evented': ['domain-driven-design', 'ddd-strategic-design', 'ddd-context-mapping', 'ddd-tactical-patterns', 'cqrs-implementation', 'event-store-design', 'saga-orchestration', 'projection-patterns'],
  'OSS Maintainer': ['commit', 'create-pr', 'requesting-code-review', 'receiving-code-review', 'changelog-automation', 'git-advanced-workflows', 'documentation-templates'],
  'Skill Author': ['skill-creator', 'skill-developer', 'writing-skills', 'documentation-generation-doc-generate', 'lint-and-validate', 'verification-before-completion']
};

function parseArgs() {
  const args = process.argv.slice(2);
  const flags = {
    bundles: [],
    all: false,
    full: false,
    check: false,
    list: false,
    help: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--bundle' || arg === '-b') {
      flags.bundles.push(args[++i]);
    } else if (arg === '--all' || arg === '-a') {
      flags.all = true;
    } else if (arg === '--full' || arg === '-f') {
      flags.full = true;
    } else if (arg === '--check' || arg === '-c') {
      flags.check = true;
    } else if (arg === '--list' || arg === '-l') {
      flags.list = true;
    } else if (arg === '--help' || arg === '-h') {
      flags.help = true;
    }
  }
  
  return flags;
}

function checkGit() {
  try {
    execSync('git --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function ensureDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeCommunityMetadata(metadata) {
  ensureDirectory(path.dirname(COMMUNITY_METADATA_PATH));
  fs.writeFileSync(COMMUNITY_METADATA_PATH, JSON.stringify(metadata, null, 2) + '\n');
}

function updateProjectLockfile(communitySkills) {
  const lockfilePath = path.join(process.cwd(), 'flow-install.lock.json');
  if (!fs.existsSync(lockfilePath)) return false;

  try {
    const lockfile = JSON.parse(fs.readFileSync(lockfilePath, 'utf8'));
    lockfile.communitySkills = communitySkills;
    fs.writeFileSync(lockfilePath, JSON.stringify(lockfile, null, 2) + '\n');
    return true;
  } catch (err) {
    console.warn('⚠️ Failed to update flow-install.lock.json:', err.message);
    return false;
  }
}

function persistCommunityInstall(communitySkills) {
  const payload = {
    ...communitySkills,
    repoDir: COMMUNITY_DIR,
    sourceDir: path.join(COMMUNITY_DIR, 'skills'),
    installDir: INSTALL_DIR,
    updatedAt: new Date().toISOString()
  };
  writeCommunityMetadata(payload);
  updateProjectLockfile(payload);
}

function cloneOrPull() {
  console.log('\n Checking community repository...\n');

  if (fs.existsSync(path.join(COMMUNITY_DIR, '.git'))) {
    console.log(' Updating skills (shallow fetch)...');
    try {
      execSync('git fetch --depth 1 origin main', { cwd: COMMUNITY_DIR, stdio: 'pipe' });
      const local = execSync('git rev-parse HEAD', { cwd: COMMUNITY_DIR, encoding: 'utf8' }).trim();
      const remote = execSync('git rev-parse FETCH_HEAD', { cwd: COMMUNITY_DIR, encoding: 'utf8' }).trim();

      if (local !== remote) {
        execSync('git checkout FETCH_HEAD -- skills/', { cwd: COMMUNITY_DIR, stdio: 'pipe' });
        console.log(' Updated community skills');
      } else {
        console.log(' Already up to date');
      }
      return { updated: local !== remote };
    } catch (err) {
      console.error(' Failed to update:', err.message);
      return { error: err.message };
    }
  } else {
    console.log(` Cloning community skills (shallow + sparse)...`);
    try {
      // Shallow clone with sparse checkout — downloads only skills/ dir, no history
      execSync(`git clone --depth 1 --filter=blob:none --sparse "${COMMUNITY_REPO}" "${COMMUNITY_DIR}"`, { stdio: 'pipe' });
      execSync('git sparse-checkout set skills/', { cwd: COMMUNITY_DIR, stdio: 'pipe' });
      console.log(' Cloned community repository (shallow)');
      return { cloned: true };
    } catch {
      // Fallback to regular shallow clone if sparse checkout not supported
      console.log(' Falling back to shallow clone...');
      try {
        execSync(`git clone --depth 1 "${COMMUNITY_REPO}" "${COMMUNITY_DIR}"`, { stdio: 'pipe' });
        console.log(' Cloned community repository (shallow fallback)');
        return { cloned: true };
      } catch (err2) {
        console.error(' Failed to clone:', err2.message);
        return { error: err2.message };
      }
    }
  }
}

function listBundles() {
  console.log('\n📋 Available bundles:\n');
  Object.keys(BUNDLES).forEach((bundle, i) => {
    console.log(`  ${String(i + 1).padStart(2)} ${bundle.padEnd(25)} (${BUNDLES[bundle].length} skills)`);
  });
  console.log();
}

function getSkillNames(bundleNames) {
  const skills = new Set();
  for (const bundle of bundleNames) {
    if (BUNDLES[bundle]) {
      BUNDLES[bundle].forEach(s => skills.add(s));
    }
  }
  return Array.from(skills);
}

function getAllSkills() {
  const skillsDir = path.join(COMMUNITY_DIR, 'skills');
  if (!fs.existsSync(skillsDir)) return [];
  return fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .filter(e => fs.existsSync(path.join(skillsDir, e.name, 'SKILL.md')))
    .map(e => e.name);
}

function copySkills(skillNames) {
  ensureDirectory(INSTALL_DIR);
  
  const installed = [];
  const skipped = [];
  
  for (const skill of skillNames) {
    const srcDir = path.join(COMMUNITY_DIR, 'skills', skill);
    const destDir = path.join(INSTALL_DIR, skill);
    
    if (fs.existsSync(destDir)) {
      skipped.push(skill);
      continue;
    }
    
    if (fs.existsSync(srcDir)) {
      try {
        fs.cpSync(srcDir, destDir, { recursive: true });
        installed.push(skill);
      } catch (err) {
        console.error(`❌ Failed to copy ${skill}:`, err.message);
      }
    } else {
      console.warn(`⚠️ Skill not found: ${skill}`);
    }
  }
  
  return { installed, skipped };
}

function mergeCatalog(skillNames, bundles) {
  if (!fs.existsSync(CATALOG_PATH)) {
    console.warn('⚠️ Catalog not found, skipping catalog update');
    return { updated: false };
  }
  
  let catalog = fs.readFileSync(CATALOG_PATH, 'utf8');
  const today = new Date().toISOString().split('T')[0];
  
  for (const skill of skillNames) {
    const skillDir = path.join(INSTALL_DIR, skill);
    const skillMd = path.join(skillDir, 'SKILL.md');
    
    if (!fs.existsSync(skillMd)) continue;
    
    const content = fs.readFileSync(skillMd, 'utf8');
    const descMatch = content.match(/^#\s+(.+)$/m);
    const description = descMatch ? descMatch[1] : `${skill} community skill`;
    
    const entry = `
---
name: ${skill}
type: community
version: 0.1.0
status: community
owner: community
blast_radius: medium
description: "${description}"
location: ~/.agents/skills/community/${skill}
invoke: "/${skill}"
permissions: []
data_categories: []
egress: []
tags: [community, ${bundles.map(b => b.toLowerCase().replace(/[^a-z]/g, '-')).join(', ')}]
depends_on: []
created: ${today}
updated: ${today}
---`;
    
    const entryPattern = new RegExp(`^---\\s*\\nname: ${skill}\\s*\\n`, 'm');
    if (!entryPattern.test(catalog)) {
      catalog += entry;
    }
  }
  
  fs.writeFileSync(CATALOG_PATH, catalog);
  return { updated: true };
}

function registerSkills() {
  console.log('\n📋 Registering skills...');
  try {
    execSync('pnpm skills:register', { stdio: 'inherit' });
    return { registered: true };
  } catch (err) {
    console.warn('⚠️ Registration failed:', err.message);
    return { registered: false, error: err.message };
  }
}

async function main() {
  const flags = parseArgs();
  
  if (flags.help) {
    console.log(`
install-skills - Install community skills from antigravity-awesome-skills

Usage: install-skills [flags]

Flags:
  --bundle, -b <name>    Install specific bundle(s)
  --all, -a               Install all bundled skills (~150 curated)
  --full, -f              Install ALL community skills (~1250, non-interactive)
  --check, -c             Check for updates without installing
  --list, -l              List available bundles
  --help, -h              Show this help

Examples:
  install-skills                           # Interactive mode
  install-skills --bundle "Web Wizard"   # Install specific bundle
  install-skills --full                    # Install all community skills
  install-skills --check                   # Check for updates
  install-skills --list                    # List bundles
`);
    return;
  }
  
  if (!checkGit()) {
    console.error('❌ Git is required but not installed.');
    process.exit(2);
  }
  
  if (flags.list) {
    listBundles();
    return;
  }
  
  const repoResult = cloneOrPull();
  if (repoResult.error) {
    process.exit(3);
  }
  
  if (flags.check) {
    console.log('\n✅ Check complete. Use install-skills to install.');
    return;
  }
  
  // --full: install every skill from the community repo (non-interactive)
  if (flags.full) {
    const allSkills = getAllSkills();
    console.log(`\nInstalling all ${allSkills.length} community skills to ${INSTALL_DIR}...`);
    
    const copyResult = copySkills(allSkills);
    console.log(`\n✅ Installed: ${copyResult.installed.length} skills`);
    if (copyResult.skipped.length > 0) {
      console.log(`   Skipped (already exists): ${copyResult.skipped.length}`);
    }
    
    const total = copyResult.installed.length + copyResult.skipped.length;
    const communitySkills = {
      mode: 'full',
      expected: [...allSkills].sort(),
      expectedCount: allSkills.length,
      strict: true
    };
    persistCommunityInstall(communitySkills);
    const regResult = registerSkills();
    if (regResult.registered) {
      console.log('✅ Refreshed agent registration');
    }
    console.log(`   Total skills in ${INSTALL_DIR}: ${total}`);
    console.log('\n✨ Done!');
    
    console.log(JSON.stringify({
      success: true,
      mode: 'full',
      installed: copyResult.installed.length,
      skipped: copyResult.skipped.length,
      total: total,
      metadata: COMMUNITY_METADATA_PATH
    }, null, 2));
    return;
  }
  
  let bundlesToInstall = flags.bundles;
  
  if (bundlesToInstall.length === 0 && !flags.all) {
    console.log('\n📋 Available bundles:\n');
    const bundleList = Object.keys(BUNDLES);
    bundleList.forEach((bundle, i) => {
      console.log(`  ${i + 1}. ${bundle} (${BUNDLES[bundle].length} skills)`);
    });
    console.log('\n💡 Use --bundle <name> to install specific bundles');
    console.log('   Or run with --all to install everything\n');
    return;
  }
  
  if (flags.all) {
    bundlesToInstall = Object.keys(BUNDLES);
  }
  
  console.log(`\n📦 Installing bundles: ${bundlesToInstall.join(', ')}`);
  
  const skillsToInstall = getSkillNames(bundlesToInstall);
  console.log(`   Skills: ${skillsToInstall.length}`);
  
  const copyResult = copySkills(skillsToInstall);
  console.log(`\n✅ Installed: ${copyResult.installed.length} skills`);
  if (copyResult.skipped.length > 0) {
    console.log(`   Skipped (already exists): ${copyResult.skipped.length}`);
  }
  
  if (copyResult.installed.length > 0) {
    const catalogResult = mergeCatalog(copyResult.installed, bundlesToInstall);
    if (catalogResult.updated) {
      console.log('✅ Updated catalog');
    }
    
    const regResult = registerSkills();
    if (regResult.registered) {
      console.log('✅ Registered skills');
    }
  }

  persistCommunityInstall({
    mode: flags.all ? 'bundle-all' : 'explicit',
    expected: [...skillsToInstall].sort(),
    expectedCount: skillsToInstall.length,
    strict: false,
    bundles: bundlesToInstall
  });
  
  console.log('\n✨ Done!');
  
  console.log(JSON.stringify({
    success: true,
    installed: copyResult.installed,
    skipped: copyResult.skipped,
    bundles: bundlesToInstall
  }, null, 2));
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
