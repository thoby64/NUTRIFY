<?php

namespace App\Services;

use Illuminate\Support\Arr;
use InvalidArgumentException;

class JwtService
{
    public function encode(array $payload): string
    {
        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $segments = [
            $this->base64UrlEncode(json_encode($header, JSON_THROW_ON_ERROR)),
            $this->base64UrlEncode(json_encode($payload, JSON_THROW_ON_ERROR)),
        ];
        $segments[] = $this->sign(implode('.', $segments));

        return implode('.', $segments);
    }

    public function decode(string $token): ?array
    {
        $segments = explode('.', $token);
        if (count($segments) !== 3) {
            return null;
        }

        [$header, $payload, $signature] = $segments;
        $expected = $this->sign($header.'.'.$payload);
        if (! hash_equals($expected, $signature)) {
            return null;
        }

        try {
            $decoded = json_decode($this->base64UrlDecode($payload), true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException|InvalidArgumentException) {
            return null;
        }

        if (! is_array($decoded)) {
            return null;
        }

        $expiresAt = Arr::get($decoded, 'exp');
        if ($expiresAt && time() >= (int) $expiresAt) {
            return null;
        }

        return $decoded;
    }

    private function sign(string $value): string
    {
        return $this->base64UrlEncode(hash_hmac('sha256', $value, $this->secret(), true));
    }

    private function secret(): string
    {
        return config('app.key') ?: 'replace-with-a-long-random-secret';
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $value): string
    {
        $remainder = strlen($value) % 4;
        if ($remainder) {
            $value .= str_repeat('=', 4 - $remainder);
        }

        $decoded = base64_decode(strtr($value, '-_', '+/'), true);
        if ($decoded === false) {
            throw new InvalidArgumentException('Invalid base64url value.');
        }

        return $decoded;
    }
}
