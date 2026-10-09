<?php
declare(strict_types=1);
namespace PawMongo\Core;

/** Parses JSON and the Mongo-style object notation used by the existing query controls. */
final class MongoJson
{
    private int $position = 0;
    private function __construct(private readonly string $text) {}

    public static function parse(string $text): mixed
    {
        try {
            $parser = new self($text);
            $value = $parser->value(0);
            $parser->space();
            if ($parser->position !== strlen($text)) throw new \RuntimeException();
            return $value;
        } catch (\Throwable) {
            throw new ApiException('Enter valid JSON or MongoDB-style JSON.');
        }
    }
    private function space(): void
    {
        while (preg_match('/\G(?:\s+|\/\/[^\r\n]*(?:\r?\n|$)|\/\*[\s\S]*?\*\/)/', $this->text, $match, 0, $this->position)) {
            $this->position += strlen($match[0]);
        }
    }
    private function take(string $char): bool
    {
        $this->space();
        if (($this->text[$this->position] ?? '') !== $char) return false;
        $this->position++;
        return true;
    }
    private function value(int $depth): mixed
    {
        if ($depth > 100) throw new \RuntimeException();
        $this->space();
        $char = $this->text[$this->position] ?? '';
        if ($char === '{') {
            $this->position++;
            $result = new \stdClass();
            if ($this->take('}')) return $result;
            do {
                $this->space();
                $char = $this->text[$this->position] ?? '';
                if ($char === '"' || $char === "'") $key = $this->string();
                elseif (preg_match('/\G[A-Za-z_$][A-Za-z0-9_$]*/', $this->text, $m, 0, $this->position)) {
                    $key = $m[0]; $this->position += strlen($key);
                } else throw new \RuntimeException();
                if (!$this->take(':')) throw new \RuntimeException();
                $result->{$key} = $this->value($depth + 1);
                if ($this->take('}')) return $result;
                if (!$this->take(',')) throw new \RuntimeException();
                if ($this->take('}')) return $result;
            } while (true);
        }
        if ($char === '[') {
            $this->position++;
            $result = [];
            if ($this->take(']')) return $result;
            do {
                $result[] = $this->value($depth + 1);
                if ($this->take(']')) return $result;
                if (!$this->take(',')) throw new \RuntimeException();
                if ($this->take(']')) return $result;
            } while (true);
        }
        if ($char === '"' || $char === "'") return $this->string();
        if (preg_match('/\G(?:true|false|null)\b/', $this->text, $m, 0, $this->position)) {
            $this->position += strlen($m[0]);
            return json_decode($m[0], false, 512, JSON_THROW_ON_ERROR);
        }
        if (preg_match('/\G[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/', $this->text, $m, 0, $this->position)) {
            $this->position += strlen($m[0]);
            $number = $m[0];
            if (strpbrk($number, '.eE') === false) return (int)$number;
            $value = (float)$number;
            if (!is_finite($value)) throw new \RuntimeException();
            return $value;
        }
        throw new \RuntimeException();
    }
    private function string(): string
    {
        $quote = $this->text[$this->position++];
        $result = '';
        while ($this->position < strlen($this->text)) {
            $char = $this->text[$this->position++];
            if ($char === $quote) return $result;
            if (ord($char) < 32) throw new \RuntimeException();
            if ($char !== '\\') { $result .= $char; continue; }
            $escape = $this->text[$this->position++] ?? '';
            if ($escape === "'") { $result .= "'"; continue; }
            if ($escape === 'u') {
                $hex = substr($this->text, $this->position, 4);
                $this->position += 4;
                if (preg_match('/^[dD][89aAbB][0-9a-fA-F]{2}$/', $hex)) {
                    if (substr($this->text, $this->position, 2) !== '\\u') throw new \RuntimeException();
                    $hex .= '\\u' . substr($this->text, $this->position + 2, 4);
                    $this->position += 6;
                }
                $result .= json_decode('"\\u' . $hex . '"', false, 512, JSON_THROW_ON_ERROR);
            } else {
                $result .= json_decode('"\\' . $escape . '"', false, 512, JSON_THROW_ON_ERROR);
            }
        }
        throw new \RuntimeException();
    }
}
