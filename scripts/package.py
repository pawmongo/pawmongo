"""Package PHP dependencies and the static, client-only Next.js theme."""
from pathlib import Path
import hashlib
import os
import zipfile

ROOT = Path(__file__).resolve().parent.parent
for required in ['lib/vendor/autoload.php', 'themes/out/index.html', 'themes/out/_next/static']:
    if not (ROOT / required).exists():
        raise SystemExit(f'Missing {required}. Run npm run build first.')

files = set()
def collect(directory, excluded=()):
    base = ROOT / directory
    for current, dirs, names in os.walk(base, followlinks=False):
        dirs[:] = sorted(d for d in dirs if d not in excluded and not (Path(current) / d).is_symlink())
        for name in names:
            file = Path(current) / name
            if file.is_symlink() or not file.is_file():
                continue
            if name.startswith('.env') and name != '.env.example':
                continue
            if name.endswith(('.log', '.tsbuildinfo', '.lock.tmp')):
                continue
            files.add(file)

collect('lib', {'.git', '__pycache__'})
collect('scripts', {'__pycache__'})
collect('themes', {'node_modules', '.next', '.cache', 'test-results'})
files.update(ROOT / name for name in ['package.json', 'README.md'])

destination = ROOT / 'download'
destination.mkdir(exist_ok=True)
archive = destination / 'pawmongo.zip'
pending = destination / 'pawmongo.zip.tmp'
try:
    with zipfile.ZipFile(pending, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as bundle:
        for file in sorted(files):
            bundle.write(file, Path('pawmongo') / file.relative_to(ROOT))
        # Private configuration and runtime data are never copied from this checkout.
        for directory in ['config', 'var']:
            info = zipfile.ZipInfo(f'pawmongo/{directory}/')
            info.external_attr = (0o40700 << 16) | 0x10
            bundle.writestr(info, '')
    pending.replace(archive)
finally:
    pending.unlink(missing_ok=True)
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix('.zip.sha256').write_text(f'{digest}  {archive.name}\n')
print(f'Built {archive} ({archive.stat().st_size:,} bytes; {len(files)} files)')
