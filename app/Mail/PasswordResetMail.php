<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $resetLink,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address(env('MAIL_FROM_ADDRESS', 'noreply@nutriqube.local'), env('MAIL_FROM_NAME', 'Nutriqube')),
            subject: 'Reset Your Password - Nutriqube',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.password-reset',
            with: [
                'user' => $this->user,
                'resetLink' => $this->resetLink,
                'userName' => $this->user->full_name ?? $this->user->username,
            ],
        );
    }
}
