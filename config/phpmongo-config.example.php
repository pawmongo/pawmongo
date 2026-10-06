<?php
// Copy to phpmongo-config.php. Serve ONLY the public/ directory.
return [
    'security' => [
        'master_password' => '', // Set before first use; replaced with a hash automatically.
        'master_password_hash' => '',
        'encryption_key' => '', // Auto-generated 64 hex characters when configuration is writable.
        'force_local_boundary' => true,
    ],
];
