<?php
declare(strict_types=1);
namespace PhpMongo\Core;

final class PageRoutes
{
    public const PATHS = ['/', '/setup', '/login', '/connect', '/workspace', '/databases/{db}', '/databases/{db}/collections/{collection}'];

    public static function matches(string $path): bool
    {
        return in_array($path, ['/', '/setup', '/login', '/connect', '/workspace'], true)
            || preg_match('~^/databases/[^/]+(?:/collections/[^/]+)?$~D', $path) === 1;
    }
}
