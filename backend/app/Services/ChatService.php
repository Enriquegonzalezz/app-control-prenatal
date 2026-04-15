<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\MessageType;
use App\Enums\RelationshipStatus;
use App\Models\DoctorPatientRelationship;
use App\Models\Message;
use App\Models\User;
use Illuminate\Support\Collection;
use RuntimeException;

final class ChatService
{
    public function __construct(
        private readonly ChatEncryptionService $encryption,
    ) {}

    /**
     * Lista las conversaciones activas del usuario (última relación activa + último mensaje).
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function listConversations(User $user): Collection
    {
        $field = $user->isDoctor() ? 'doctor_id' : 'patient_id';

        return DoctorPatientRelationship::where($field, $user->id)
            ->where('status', RelationshipStatus::ACTIVE->value)
            ->with([
                'doctor:id,name,avatar_url',
                'patient:id,name,avatar_url',
            ])
            ->get()
            ->map(function (DoctorPatientRelationship $rel) use ($user): array {
                $lastMsg = Message::where('relationship_id', $rel->id)
                    ->latest('created_at')
                    ->first();

                $unread = Message::where('relationship_id', $rel->id)
                    ->where('sender_id', '!=', $user->id)
                    ->whereNull('read_at')
                    ->count();

                return [
                    'relationship_id' => $rel->id,
                    'other_party'     => $user->isDoctor() ? $rel->patient : $rel->doctor,
                    'last_message'    => $lastMsg ? $this->decryptMessage($lastMsg) : null,
                    'unread_count'    => $unread,
                ];
            });
    }

    /**
     * Devuelve los mensajes de una relación (desencriptados), paginados.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function getMessages(
        User $user,
        DoctorPatientRelationship $relationship,
        int $limit = 50,
        ?string $beforeId = null,
    ): Collection {
        $this->assertParticipant($user, $relationship);

        $query = Message::where('relationship_id', $relationship->id)
            ->with('sender:id,name,avatar_url')
            ->orderBy('created_at', 'desc')
            ->limit($limit);

        if ($beforeId) {
            $pivot = Message::find($beforeId);
            if ($pivot) {
                $query->where('created_at', '<', $pivot->created_at);
            }
        }

        return $query->get()
            ->map(fn (Message $msg) => $this->decryptMessage($msg))
            ->reverse()
            ->values();
    }

    /**
     * Envía un mensaje nuevo (cifrado antes de persistir).
     *
     * @return array<string, mixed>
     */
    public function send(
        User $sender,
        DoctorPatientRelationship $relationship,
        string $content,
        MessageType $type = MessageType::TEXT,
    ): array {
        $this->assertParticipant($sender, $relationship);

        if ($relationship->status !== RelationshipStatus::ACTIVE) {
            throw new RuntimeException('No puedes enviar mensajes en una relación inactiva.');
        }

        $message = Message::create([
            'relationship_id'  => $relationship->id,
            'sender_id'        => $sender->id,
            'content_encrypted'=> $this->encryption->encrypt($content),
            'type'             => $type,
        ]);

        $message->load('sender:id,name,avatar_url');

        return $this->decryptMessage($message);
    }

    /**
     * Marca todos los mensajes no leídos del interlocutor como leídos.
     */
    public function markRead(User $reader, DoctorPatientRelationship $relationship): int
    {
        $this->assertParticipant($reader, $relationship);

        return Message::where('relationship_id', $relationship->id)
            ->where('sender_id', '!=', $reader->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }

    // ── helpers ──────────────────────────────────────────────

    /**
     * @return array<string, mixed>
     */
    private function decryptMessage(Message $message): array
    {
        return [
            'id'              => $message->id,
            'relationship_id' => $message->relationship_id,
            'sender_id'       => $message->sender_id,
            'sender'          => $message->sender,
            'content'         => $this->encryption->decrypt($message->content_encrypted),
            'type'            => $message->type,
            'read_at'         => $message->read_at,
            'created_at'      => $message->created_at,
        ];
    }

    private function assertParticipant(User $user, DoctorPatientRelationship $relationship): void
    {
        $isParticipant = in_array($user->id, [
            $relationship->doctor_id,
            $relationship->patient_id,
        ], true);

        if (!$isParticipant) {
            abort(403, 'No tienes acceso a esta conversación.');
        }
    }
}
