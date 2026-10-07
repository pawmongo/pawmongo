#!/usr/bin/env python3
"""Build an allowlisted release with isolated production Composer dependencies."""
import argparse
import hashlib
import json
import os
import re
from pathlib import Path
import shutil
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parent.parent
VERSION = '1.0.0'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--composer', default='composer', help='Composer executable or .phar path')
args = parser.parse_args()
if (ROOT / 'frontend/app').exists():
    parser.error('This legacy packager creates PHP-only releases. The Next.js frontend requires a Node.js deployment; use npm run build and npm start for this checkout.')
if args.composer.endswith('.phar'):
    if not Path(args.composer).is_file():
        parser.error('Composer PHAR not found. Supply its path with --composer /path/to/composer.phar.')
    args.composer = str(Path(args.composer).resolve())
elif shutil.which(args.composer) is None:
    parser.error('Composer is not installed on PATH. Install Composer or use --composer /path/to/composer.phar.')
composer = ['php', args.composer] if args.composer.endswith('.phar') else [args.composer]
subprocess.run(['npm', 'run', 'build'], cwd=ROOT, check=True)
with tempfile.TemporaryDirectory(prefix='phpmongo-release-') as temporary:
    stage = Path(temporary) / f'phpmongo-{VERSION}'
    stage.mkdir()
    for name in ['composer.json', 'composer.lock', 'LICENSE', 'README.md', 'INSTALL.md']:
        shutil.copy2(ROOT / name, stage / name)
    for name in ['src', 'public', 'templates']:
        shutil.copytree(ROOT / name, stage / name)
    notices = stage / 'licenses/frontend'
    notices.mkdir(parents=True)
    packages = ['react', 'react-dom', 'scheduler', 'lucide-react', 'tailwindcss', '@fontsource-variable/manrope', '@fontsource/ibm-plex-mono']
    for package in packages:
        shutil.copy2(ROOT / 'node_modules' / package / 'LICENSE', notices / (package.replace('@', '').replace('/', '-') + '.txt'))
    (stage / 'THIRD-PARTY-NOTICES.md').write_text('# Third-party notices\n\nPHP dependency licenses are retained under vendor/. Bundled React, Scheduler, Lucide, Tailwind, Manrope, and IBM Plex Mono license texts are under licenses/frontend/.\n\nThe colourful icons were supplied through the user-provided Drive folder; their original sources are recorded in public/assets/icons/sources.json. The project MIT license does not relicense third-party assets.\n')
    (stage / 'config').mkdir()
    shutil.copy2(ROOT / 'config/phpmongo-config.example.php', stage / 'config/phpmongo-config.example.php')
    # Developer and community documentation stays in the source repository.
    for filename in ['README.md', 'INSTALL.md']:
        document = stage / filename
        text = re.sub(r'\]\(((?:docs/|GLOSSARY\.md|CONTRIBUTING\.md|CODE_OF_CONDUCT\.md)[^)]*)\)',
                      lambda match: '](' + 'https://github.com/phpmongolab/phpmongo/blob/main/' + match[1] + ')',
                      document.read_text())
        document.write_text(text)
    subprocess.run(composer + ['install', '--no-dev', '--prefer-dist', '--no-interaction', '--no-progress', '--optimize-autoloader', '--no-plugins', '--no-scripts'], cwd=stage, check=True)
    subprocess.run(composer + ['check-platform-reqs', '--no-dev'], cwd=stage, check=True)
    prohibited = {'node_modules', '.git', '.agents', 'test-results', 'phpdocumentor', 'phpmongo-config.php'}
    files = sorted(path for path in stage.rglob('*') if path.is_file())
    for path in files:
        if prohibited.intersection(path.relative_to(stage).parts) or path.suffix in {'.so', '.dll', '.log', '.phar'} or path.is_symlink():
            raise RuntimeError(f'Unexpected release file: {path}')
    manifest = {str(path.relative_to(stage)): hashlib.sha256(path.read_bytes()).hexdigest() for path in files}
    (stage / 'release-manifest.json').write_text(json.dumps({'version': VERSION, 'sha256': manifest}, indent=2) + '\n')
    destination = ROOT / 'dist'
    destination.mkdir(exist_ok=True)
    archive = destination / f'phpmongo-{VERSION}.zip'
    pending = archive.with_suffix('.zip.tmp')
    with zipfile.ZipFile(pending, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
        for path in sorted(stage.rglob('*')):
            if path.is_file():
                info = zipfile.ZipInfo(str(path.relative_to(stage.parent)), date_time=(2026, 10, 6, 0, 0, 0))
                info.external_attr = 0o100644 << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                bundle.writestr(info, path.read_bytes())
    os.replace(pending, archive)
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    archive.with_suffix('.zip.sha256').write_text(f'{digest}  {archive.name}\n')
    print(f'Release: {archive} ({archive.stat().st_size:,} bytes)')
