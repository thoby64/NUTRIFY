<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PasswordResetToken;
use App\Models\User;
use App\Services\JwtService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    public function login(Request $request, JwtService $jwt): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'username' => ['required', 'string'],
                'password' => ['required', 'string'],
            ]);

            if ($validator->fails()) {
                return response()->json(['detail' => $validator->errors()->first()], 422);
            }

            $username = (string) $request->input('username');
            $password = (string) $request->input('password');

            $user = User::query()
                ->where('username', $username)
                ->first();
            if (! $user || ! password_verify($password, $user->password_hash)) {
                return response()->json(['detail' => 'Invalid username or password'], 401);
            }

            if (! $user->is_active) {
                return response()->json(['detail' => 'User account is disabled'], 403);
            }

            $user->forceFill(['last_login' => now()])->save();
            $expiresAt = now()->addMinutes((int) env('ACCESS_TOKEN_EXPIRE_MINUTES', 1440));

            $token = $jwt->encode([
                'sub' => $user->username,
                'user_id' => $user->id,
                'role' => $user->roleValue(),
                'iat' => now()->timestamp,
                'exp' => $expiresAt->timestamp,
            ]);

            return response()->json([
                'access_token' => $token,
                'token_type' => 'bearer',
                'user' => $this->serializeUser($user),
            ]);
        } catch (\Exception $e) {
            \Log::error('Login failed: ' . $e->getMessage(), [
                'username' => $request->input('username'),
                'exception' => $e,
            ]);
            return response()->json([
                'detail' => 'An error occurred during login. Please try again later.',
            ], 500);
        }
    }

    public function verify(Request $request, JwtService $jwt): JsonResponse
    {
        $token = $request->query('token');
        if (! $token) {
            return response()->json(['detail' => 'No token provided'], 401);
        }

        $payload = $jwt->decode($token);
        if (! $payload || empty($payload['user_id'])) {
            return response()->json(['detail' => 'Invalid or expired token'], 401);
        }

        $user = User::query()->find($payload['user_id']);
        if (! $user || ! $user->is_active) {
            return response()->json(['detail' => 'User is no longer valid'], 401);
        }

        return response()->json([
            'valid' => true,
            'user_id' => $user->id,
            'username' => $user->username,
            'role' => $user->roleValue(),
        ]);
    }

    public function me(): JsonResponse
    {
        return response()->json(['user' => $this->serializeUser(Auth::user())]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email'],
        ]);

        if ($validator->fails()) {
            return response()->json(['detail' => $validator->errors()->first()], 422);
        }

        $email = (string) $request->input('email');
        $user = User::query()
            ->where('email', $email)
            ->where('is_active', true)
            ->first();

        // If email doesn't exist, return error
        if (!$user) {
            return response()->json([
                'detail' => 'No active account found with this email address',
                'email_sent' => false,
            ], 404);
        }

        try {
            $plainToken = $this->generateResetToken();
            PasswordResetToken::query()->create([
                'user_id' => $user->id,
                'token' => hash('sha256', $plainToken),
                'expires_at' => now()->addHour(),
            ]);

            $resetLink = url('/reset-password?token='.$plainToken);
            
            // Send email
            \Illuminate\Support\Facades\Mail::send('emails.password-reset', [
                'user' => $user,
                'resetLink' => $resetLink,
            ], function ($message) use ($user) {
                $message->to($user->email)
                    ->subject('Password Reset Request - Nutriqube');
            });

            $payload = [
                'message' => 'Password reset link has been sent to your email address',
                'email_sent' => true,
            ];

            if (app()->environment('local')) {
                $payload['reset_link'] = $resetLink;
            }

            return response()->json($payload, 200);
        } catch (\Exception $e) {
            \Log::error('Password reset email failed: ' . $e->getMessage());
            return response()->json([
                'detail' => 'Failed to send reset link. Please try again later.',
                'email_sent' => false,
            ], 500);
        }
    }

    public function checkEmailExists(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email'],
        ]);

        if ($validator->fails()) {
            return response()->json(['detail' => $validator->errors()->first()], 422);
        }

        $email = (string) $request->input('email');
        $exists = User::query()->where('email', $email)->exists();

        return response()->json([
            'exists' => $exists,
            'email' => $email,
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'token' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:8'],
            'confirm_password' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json(['detail' => $validator->errors()->first()], 422);
        }

        if ($request->input('new_password') !== $request->input('confirm_password')) {
            return response()->json(['detail' => 'Passwords do not match'], 400);
        }

        $resetToken = PasswordResetToken::query()
            ->where('token', hash('sha256', (string) $request->input('token')))
            ->first();

        if (! $resetToken) {
            return response()->json(['detail' => 'Invalid password reset token'], 400);
        }
        if ($resetToken->used_at) {
            return response()->json(['detail' => 'This password reset link has already been used'], 400);
        }
        if ($resetToken->expires_at->isPast()) {
            return response()->json(['detail' => 'This password reset link has expired. Please request a new one.'], 400);
        }

        $user = User::query()->find($resetToken->user_id);
        if (! $user) {
            return response()->json(['detail' => 'User not found'], 404);
        }

        $user->forceFill(['password_hash' => Hash::make((string) $request->input('new_password'))])->save();
        $resetToken->forceFill(['used_at' => now()])->save();

        return response()->json([
            'message' => 'Password has been reset successfully. You can now login with your new password.',
            'success' => true,
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:8'],
            'confirm_password' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json(['detail' => $validator->errors()->first()], 422);
        }

        /** @var User|null $user */
        $user = Auth::user();
        if (! $user || ! password_verify((string) $request->input('current_password'), $user->password_hash)) {
            return response()->json(['detail' => 'Current password is incorrect'], 401);
        }
        if ($request->input('new_password') !== $request->input('confirm_password')) {
            return response()->json(['detail' => 'Passwords do not match'], 400);
        }
        if (password_verify((string) $request->input('new_password'), $user->password_hash)) {
            return response()->json(['detail' => 'New password must be different from current password'], 400);
        }

        $user->forceFill(['password_hash' => Hash::make((string) $request->input('new_password'))])->save();

        return response()->json([
            'message' => 'Password changed successfully',
            'success' => true,
        ]);
    }

    public function profile(): JsonResponse
    {
        return response()->json(['user' => $this->serializeUser(Auth::user())]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::user();
        if (!$user) {
            return response()->json(['detail' => 'User not found'], 404);
        }

        // Only admin can update username
        if ($user->roleValue() === 'admin') {
            $validationRules = [
                'username' => ['sometimes', 'string', 'min:3', 'max:50', Rule::unique('users', 'username')->ignore($user->id)],
                'full_name' => ['sometimes', 'nullable', 'string', 'max:100'],
                'email' => ['sometimes', 'email', 'max:100', Rule::unique('users', 'email')->ignore($user->id)],
                'password' => ['sometimes', 'string', 'min:8'],
                'confirm_password' => ['sometimes', 'string'],
            ];
        } else {
            // Manager and Nutritionist cannot update username
            $validationRules = [
                'full_name' => ['sometimes', 'nullable', 'string', 'max:100'],
                'email' => ['sometimes', 'email', 'max:100', Rule::unique('users', 'email')->ignore($user->id)],
                'password' => ['sometimes', 'string', 'min:8'],
                'confirm_password' => ['sometimes', 'string'],
            ];
        }

        $validator = Validator::make($request->all(), $validationRules);

        if ($validator->fails()) {
            return response()->json(['detail' => $validator->errors()->first()], 422);
        }

        // Update username (only for admin)
        if ($user->roleValue() === 'admin' && $request->has('username')) {
            $user->username = (string) $request->input('username');
        }

        // Update full_name
        if ($request->has('full_name')) {
            $user->full_name = $request->input('full_name');
        }

        // Update email
        if ($request->has('email')) {
            $user->email = (string) $request->input('email');
        }

        // Update password (if provided)
        if ($request->has('password')) {
            if (!$request->has('confirm_password') || $request->input('password') !== $request->input('confirm_password')) {
                return response()->json(['detail' => 'Passwords do not match'], 400);
            }
            if (password_verify((string) $request->input('password'), $user->password_hash)) {
                return response()->json(['detail' => 'New password must be different from current password'], 400);
            }
            $user->password_hash = Hash::make((string) $request->input('password'));
        }

        $user->save();

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $this->serializeUser($user->fresh()),
            'success' => true,
        ]);
    }

    private function serializeUser(?User $user): ?array
    {
        if (! $user) {
            return null;
        }

        return [
            'id' => $user->id,
            'username' => $user->username,
            'email' => $user->email,
            'full_name' => $user->full_name,
            'role' => $user->roleValue(),
            'is_active' => $user->is_active,
            'created_at' => optional($user->created_at)->toISOString(),
            'last_login' => optional($user->last_login)->toISOString(),
            'updated_at' => optional($user->updated_at)->toISOString(),
            'created_by_id' => $user->created_by_id,
        ];
    }

    private function generateResetToken(): string
    {
        return rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
    }
}
