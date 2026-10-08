import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  '.turbo',
  '.cache',
  '.npm',
]);

const EXCLUDED_FILES = new Set([
  'bun.lock',
]);

function addDirectoryRecursively(zipFolder: JSZip, dirPath: string) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      const subFolder = zipFolder.folder(entry.name);
      if (subFolder) {
        addDirectoryRecursively(subFolder, path.join(dirPath, entry.name));
      }
    } else if (entry.isFile()) {
      if (EXCLUDED_FILES.has(entry.name)) continue;
      // Skip excessively large binary files or socket files if any
      const fullPath = path.join(dirPath, entry.name);
      const stat = fs.statSync(fullPath);
      if (stat.size > 25 * 1024 * 1024) continue; // skip >25MB
      const fileData = fs.readFileSync(fullPath);
      zipFolder.file(entry.name, fileData);
    }
  }
}

export async function GET() {
  try {
    const rootDir = process.cwd();
    const zip = new JSZip();

    // Add source code and config files
    const targets = [
      'app',
      'components',
      'context',
      'hooks',
      'lib',
      'public',
      'package.json',
      'tsconfig.json',
      'next.config.ts',
      'postcss.config.mjs',
      'metadata.json',
      '.env.example',
      '.eslintrc.json',
      'eslint.config.mjs',
    ];

    for (const target of targets) {
      const fullPath = path.join(rootDir, target);
      if (!fs.existsSync(fullPath)) continue;
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        const folder = zip.folder(target);
        if (folder) {
          addDirectoryRecursively(folder, fullPath);
        }
      } else if (stat.isFile()) {
        zip.file(target, fs.readFileSync(fullPath));
      }
    }

    // Add a README file with instructions
    const readmeContent = `# MongoDB Compass - Document Explorer
Interactive MongoDB document browser and collection explorer with query filter, syntax highlighting, and multiple view modes matching the Atlas and Compass experience.

## Getting Started
1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
2. Run development server:
   \`\`\`bash
   npm run dev
   \`\`\`
3. Open [http://localhost:3000](http://localhost:3000) in your browser.
`;
    zip.file('README.md', readmeContent);

    const buffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="mongodb-compass-codebase.zip"',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Failed to generate project zip:', error);
    return NextResponse.json(
      { error: 'Failed to generate project zip' },
      { status: 500 }
    );
  }
}
