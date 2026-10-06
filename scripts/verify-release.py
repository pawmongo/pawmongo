#!/usr/bin/env python3
"""Verify release hashes, run backend checks, and smoke-test extracted setup."""
import hashlib
import json
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import zipfile

root = Path(__file__).resolve().parent.parent
archive = root / 'dist/phpmongo-1.0.0.zip'
assert hashlib.sha256(archive.read_bytes()).hexdigest() == archive.with_suffix('.zip.sha256').read_text().split()[0]
with tempfile.TemporaryDirectory(prefix='phpmongo-extracted-') as temporary:
    with zipfile.ZipFile(archive) as bundle:
        assert bundle.testzip() is None
        bundle.extractall(temporary)
    release = Path(temporary) / 'phpmongo-1.0.0'
    manifest = json.loads((release / 'release-manifest.json').read_text())
    actual = {str(p.relative_to(release)) for p in release.rglob('*') if p.is_file()}
    assert actual == set(manifest['sha256']) | {'release-manifest.json'}
    for name, digest in manifest['sha256'].items():
        assert hashlib.sha256((release / name).read_bytes()).hexdigest() == digest, name
    assert not (release / 'config/phpmongo-config.php').exists()
    assert not (release / 'var').exists()
    # Tests are supplied by this verifier after checking the archive's exact contents.
    shutil.copytree(root / 'tests', release / 'tests')
    subprocess.run(['php', str(release / 'tests/run.php')], cwd=release, check=True)
    for minimal in [True, False]:
        if not minimal:
            shutil.copy2(release / 'config/phpmongo-config.example.php', release / 'config/phpmongo-config.php')
            config = release / 'config/phpmongo-config.php'
            config.write_text(config.read_text().replace("'master_password' => ''", "'master_password' => 'release-smoke-only'"))
        with socket.socket() as socket_:
            socket_.bind(('127.0.0.1', 0))
            port = socket_.getsockname()[1]
        command = ['php'] + (['-n'] if minimal else []) + ['-S', f'127.0.0.1:{port}', '-t', 'public', 'public/router.php']
        with tempfile.TemporaryFile() as log:
            server = subprocess.Popen(command, cwd=release, stdout=log, stderr=log)
            try:
                for attempt in range(50):
                    try:
                        try:
                            response = urllib.request.urlopen(f'http://127.0.0.1:{port}/')
                        except urllib.error.HTTPError as error:
                            response = error
                        body = response.read().decode()
                        break
                    except urllib.error.URLError:
                        time.sleep(0.1)
                else:
                    raise RuntimeError('Extracted server failed to start')
                if minimal:
                    assert response.status == 503 and 'phpMongo prerequisites' in body
                else:
                    assert response.status == 200 and '/assets/index-' in body
                    import re
                    for asset in re.findall(r'(?:src|href)="(/assets/[^\"]+)"', body):
                        with urllib.request.urlopen(f'http://127.0.0.1:{port}{asset}') as resource:
                            assert resource.status == 200 and resource.read()
                    settings = subprocess.check_output(['php', '-r', '$c=require $argv[1]; echo json_encode([strlen($c["security"]["encryption_key"]),password_verify("release-smoke-only",$c["security"]["master_password_hash"])]);', str(config)], text=True)
                    assert json.loads(settings) == [64, True]
            finally:
                server.terminate()
                server.wait(timeout=10)
print('PASS: archive integrity, exact manifest, 79 extracted backend checks, missing-extension preflight, first-run config conversion, compiled page and assets')
