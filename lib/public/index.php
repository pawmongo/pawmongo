<?php
declare(strict_types=1);
if (getenv('PAWMONGO_LEGACY_API') === '1') {
    require __DIR__ . '/legacy.php';
    return;
}
require dirname(__DIR__) . '/vendor/autoload.php';
\PawMongo\BrowserApplication::create(dirname(__DIR__, 2))->run();
