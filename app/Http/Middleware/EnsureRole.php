<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\JwtService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $authorization = (string) $request->header('Authorization', '');
        if (! str_starts_with(strtolower($authorization), 'bearer ')) {
            return response()->json(['detail' => 'Missing authorization header'], 401);
        }

        $payload = app(JwtService::class)->decode(trim(substr($authorization, 7)));
        if (! $payload || empty($payload['user_id'])) {
            return response()->json(['detail' => 'Invalid or expired token'], 401);
        }

        $user = User::query()->find($payload['user_id']);
        if (! $user || ! $user->is_active) {
            return response()->json(['detail' => 'User not found or inactive'], 401);
        }

        $allowed = collect($roles)->map(fn (string $role) => strtolower($role));
        if ($allowed->isNotEmpty() && ! $allowed->contains($user->roleValue())) {
            return response()->json(['detail' => 'One of these roles required: '.$allowed->implode(', ')], 403);
        }

        Auth::setUser($user);
        $request->attributes->set('current_user', $user);

        return $next($request);
    }
}
