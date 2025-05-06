<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class CollaboratorAdded extends Notification
{
    use Queueable;

    public $documentName;
    public $ownerName;

    public function __construct($documentName, $ownerName)
    {
        $this->documentName = $documentName;
        $this->ownerName = $ownerName;
    }

    public function via($notifiable)
    {
        return ['mail'];
    }

    public function toMail($notifiable)
    {
        return (new MailMessage)
        ->subject('You have been added as a collaborator to a document')
        ->line('Hello,')
        ->line('You have been added as a collaborator to the following document:')
        ->line('Document: ' . $this->documentName)
        ->line('Added by: ' . $this->ownerName)
        ->line('This email is to inform you that you now have access to collaborate on this document. Please reach out to the document owner if you have any questions regarding the collaboration.')
        ->line('Best regards,')
        ->line('The Team');
    }
}
