<?php
/**
 * Encodes JSON responses within an explicit serialized byte budget.
 */
declare(strict_types=1);
namespace PawMongo\Core;
use Psr\Http\Message\ResponseInterface;
/**
 * Encodes JSON responses within an explicit serialized byte budget.
 */
final class Json
{
    /**
     * Encode a response and enforce its complete serialized byte budget.
     * @param ResponseInterface $response Response receiving the encoded body.
     * @param mixed $data JSON-serializable response payload.
     * @param int $status HTTP response status.
     * @param int $budget Maximum encoded body length in bytes.
     * @return ResponseInterface JSON response with the requested status.
     * @throws ApiException If serialization exceeds the byte budget.
     */
    public static function response(ResponseInterface $response, mixed $data, int $status = 200, int $budget = 1048576): ResponseInterface
    {
        $json = json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
        if (strlen($json) > $budget) {
            throw new ApiException('Response exceeds its size budget. Refine the filter or expand a smaller field.', 413);
        }
        $response->getBody()->write($json);
        return $response->withStatus($status)->withHeader('Content-Type', 'application/json; charset=utf-8');
    }
}
