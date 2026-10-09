<?php
/**
 * Carries a sanitized API error message and its HTTP response status.
 */
declare(strict_types=1);
namespace PawMongo\Core;
/**
 * Carries a sanitized API error message and its HTTP response status.
 */
final class ApiException extends \RuntimeException
{
    /**
     * Create an error that can be returned without exposing driver or credential details.
     * @param string $message Safe user-facing error text.
     * @param int $status HTTP error status.
     */
    public function __construct(string $message, public readonly int $status = 400)
    {
        parent::__construct($message);
    }
}
