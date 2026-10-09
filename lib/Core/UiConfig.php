<?php
/**
 * Exposes public sponsorship content without private application configuration.
 */
declare(strict_types=1);
namespace PawMongo\Core;
/**
 * Provides locally rendered sponsorship content with working community defaults.
 */
final class UiConfig
{
    /**
     * Select bounded public content for both interface sponsorship zones.
     * Only titles, descriptions, labels, and safe destinations are exposed.
     *
     * @param array<string, mixed> $config Private server configuration.
     * @return array<string, mixed> Public UI content without credentials or secrets.
     */
    public static function publicContent(array $config): array
    {
        $defaults = [
            'login' => ['label' => 'BUILT WITH THE COMMUNITY', 'title' => 'Good tools grow together.', 'description' => 'A small, open-source workspace for curious developers. Explore the docs and help shape what comes next.', 'href' => '#guide'],
            'sidebar' => ['label' => 'COMMUNITY SUPPORTED', 'title' => 'Help PawMongo grow', 'description' => 'Explore the developer guide', 'href' => '#guide'],
        ];
        foreach ($defaults as $zone => &$content) {
            $candidate = $config['sponsors'][$zone] ?? [];
            if (!is_array($candidate)) {
                continue;
            }
            foreach (['label' => 40, 'title' => 60, 'description' => 160] as $key => $max) {
                if (isset($candidate[$key]) && is_string($candidate[$key]) && trim($candidate[$key]) !== '') {
                    $content[$key] = substr($candidate[$key], 0, $max);
                }
            }
            $href = $candidate['href'] ?? '';
            if (is_string($href) && strlen($href) <= 2048 && ($href === '#guide' || (filter_var($href, FILTER_VALIDATE_URL) && parse_url($href, PHP_URL_SCHEME) === 'https' && parse_url($href, PHP_URL_USER) === null && parse_url($href, PHP_URL_PASS) === null))) {
                $content['href'] = $href;
            }
        }
        unset($content);
        return ['sponsors' => $defaults];
    }
}
