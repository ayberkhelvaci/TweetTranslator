const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

interface Checkpoint {
  version: string;
  date: string;
  description: string;
  gitHash: string;
  files: string[];
}

const CHECKPOINTS_DIR = '.checkpoints';
const CHECKPOINTS_FILE = path.join(CHECKPOINTS_DIR, 'checkpoints.json');

function ensureCheckpointsDir() {
  if (!fs.existsSync(CHECKPOINTS_DIR)) {
    fs.mkdirSync(CHECKPOINTS_DIR);
  }
  if (!fs.existsSync(CHECKPOINTS_FILE)) {
    fs.writeFileSync(CHECKPOINTS_FILE, JSON.stringify([], null, 2));
  }
}

function getGitHash(): string {
  return execSync('git rev-parse HEAD').toString().trim();
}

function getTrackedFiles(): string[] {
  return execSync('git ls-files').toString().trim().split('\n');
}

function createCheckpoint(version: string, description: string) {
  ensureCheckpointsDir();

  const checkpoint: Checkpoint = {
    version,
    date: new Date().toISOString(),
    description,
    gitHash: getGitHash(),
    files: getTrackedFiles()
  };

  // Create git tag
  execSync(`git tag -a ${version} -m "${description}"`);

  // Save checkpoint info
  const checkpoints: Checkpoint[] = JSON.parse(fs.readFileSync(CHECKPOINTS_FILE, 'utf-8'));
  checkpoints.push(checkpoint);
  fs.writeFileSync(CHECKPOINTS_FILE, JSON.stringify(checkpoints, null, 2));

  // Create a backup of current state
  const backupDir = path.join(CHECKPOINTS_DIR, version);
  fs.mkdirSync(backupDir, { recursive: true });

  // Copy all tracked files
  checkpoint.files.forEach(file => {
    const targetDir = path.join(backupDir, path.dirname(file));
    fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(file, path.join(backupDir, file));
  });

  console.log(`Created checkpoint ${version}`);
}

function revertToCheckpoint(version: string) {
  const checkpoints: Checkpoint[] = JSON.parse(fs.readFileSync(CHECKPOINTS_FILE, 'utf-8'));
  const checkpoint = checkpoints.find(cp => cp.version === version);

  if (!checkpoint) {
    throw new Error(`Checkpoint ${version} not found`);
  }

  // Create backup of current state before reverting
  const tempBackup = path.join(CHECKPOINTS_DIR, '_temp_backup_' + Date.now());
  getTrackedFiles().forEach(file => {
    const targetDir = path.join(tempBackup, path.dirname(file));
    fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(file, path.join(tempBackup, file));
  });

  try {
    // Revert to the checkpoint version
    execSync(`git checkout ${version}`);
    console.log(`Successfully reverted to ${version}`);
  } catch (error) {
    // Restore from temp backup if revert fails
    console.error('Revert failed, restoring from backup...');
    getTrackedFiles().forEach(file => {
      fs.copyFileSync(path.join(tempBackup, file), file);
    });
    throw error;
  } finally {
    // Clean up temp backup
    fs.rmSync(tempBackup, { recursive: true, force: true });
  }
}

function listCheckpoints() {
  ensureCheckpointsDir();
  const checkpoints: Checkpoint[] = JSON.parse(fs.readFileSync(CHECKPOINTS_FILE, 'utf-8'));
  return checkpoints;
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];

  switch (command) {
    case 'create':
      if (!arg1 || !arg2) {
        console.error('Usage: checkpoint.ts create <version> <description>');
        process.exit(1);
      }
      createCheckpoint(arg1, arg2);
      break;

    case 'revert':
      if (!arg1) {
        console.error('Usage: checkpoint.ts revert <version>');
        process.exit(1);
      }
      revertToCheckpoint(arg1);
      break;

    case 'list':
      console.table(listCheckpoints());
      break;

    default:
      console.error('Unknown command. Use: create, revert, or list');
      process.exit(1);
  }
}

module.exports = {
  createCheckpoint,
  revertToCheckpoint,
  listCheckpoints
}; 