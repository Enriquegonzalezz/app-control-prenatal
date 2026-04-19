<?php

declare(strict_types=1);

namespace App\Http\Controllers\Chat;

use App\Enums\MessageType;
use App\Enums\RelationshipStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Chat\SendMessageRequest;
use App\Models\DoctorPatientRelationship;
use App\Models\User;
use App\Services\ChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

final class ChatController extends Controller
{
    public function __construct(
        private readonly ChatService $chatService,
    ) {}

    /**
     * Lista las conversaciones del usuario autenticado.
     */
    public function conversations(Request $request): JsonResponse
    {
        $conversations = $this->chatService->listConversations($request->user());

        return response()->json([
            'status'  => 'success',
            'message' => 'Conversaciones obtenidas correctamente.',
            'data'    => $conversations,
        ]);
    }

    /**
     * Devuelve los mensajes de una conversación (desencriptados).
     */
    public function messages(Request $request, DoctorPatientRelationship $relationship): JsonResponse
    {
        $messages = $this->chatService->getMessages(
            $request->user(),
            $relationship,
            (int) $request->query('limit', 50),
            $request->query('before_id'),
        );

        return response()->json([
            'status'  => 'success',
            'message' => 'Mensajes obtenidos correctamente.',
            'data'    => $messages,
        ]);
    }

    /**
     * Envía un mensaje nuevo.
     */
    public function send(SendMessageRequest $request, DoctorPatientRelationship $relationship): JsonResponse
    {
        try {
            $message = $this->chatService->send(
                $request->user(),
                $relationship,
                $request->validated('content'),
                MessageType::tryFrom($request->validated('type') ?? '') ?? MessageType::TEXT,
            );
        } catch (RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Mensaje enviado correctamente.',
            'data'    => $message,
        ], Response::HTTP_CREATED);
    }

    /**
     * Inicia (o recupera) una conversación entre el usuario autenticado y el target.
     * Si la relación no existe, se crea como ACTIVE para habilitar el chat de inmediato.
     * Válido para paciente→médico o médico→paciente.
     */
    public function startConversation(Request $request, User $user): JsonResponse
    {
        $auth = $request->user();

        // Determinar roles en la relación
        if ($auth->isPatient() && $user->isDoctor()) {
            $doctorId  = $user->id;
            $patientId = $auth->id;
        } elseif ($auth->isDoctor() && $user->isPatient()) {
            $doctorId  = $auth->id;
            $patientId = $user->id;
        } else {
            return response()->json([
                'status'  => 'error',
                'message' => 'La conversación debe ser entre un médico y un paciente.',
                'data'    => null,
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $relationship = DoctorPatientRelationship::firstOrCreate(
            ['doctor_id' => $doctorId, 'patient_id' => $patientId],
            ['status'    => RelationshipStatus::ACTIVE, 'started_at' => now()],
        );

        if ($relationship->status !== RelationshipStatus::ACTIVE) {
            $relationship->status = RelationshipStatus::ACTIVE;
            $relationship->save();
        }

        $relationship->load(['doctor:id,name,avatar_url', 'patient:id,name,avatar_url']);

        return response()->json([
            'status'  => 'success',
            'message' => 'Conversación iniciada.',
            'data'    => [
                'relationship_id' => $relationship->id,
                'other_party'     => $auth->isDoctor() ? $relationship->patient : $relationship->doctor,
            ],
        ]);
    }

    /**
     * Busca la relación activa entre el usuario autenticado y el usuario target.
     * Permite navegar directamente al chat desde la pantalla de citas.
     */
    public function findRelationship(Request $request, User $user): JsonResponse
    {
        $auth = $request->user();

        $query = $auth->isDoctor()
            ? DoctorPatientRelationship::where('doctor_id', $auth->id)->where('patient_id', $user->id)
            : DoctorPatientRelationship::where('patient_id', $auth->id)->where('doctor_id', $user->id);

        $relationship = $query
            ->where('status', RelationshipStatus::ACTIVE->value)
            ->with(['doctor:id,name,avatar_url', 'patient:id,name,avatar_url'])
            ->first();

        if (! $relationship) {
            return response()->json([
                'status'  => 'error',
                'message' => 'No existe una relación activa con este usuario.',
                'data'    => null,
            ], Response::HTTP_NOT_FOUND);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Relación encontrada.',
            'data'    => [
                'relationship_id' => $relationship->id,
                'other_party'     => $auth->isDoctor() ? $relationship->patient : $relationship->doctor,
            ],
        ]);
    }

    /**
     * Marca todos los mensajes no leídos del interlocutor como leídos.
     */
    public function markRead(Request $request, DoctorPatientRelationship $relationship): JsonResponse
    {
        $count = $this->chatService->markRead($request->user(), $relationship);

        return response()->json([
            'status'  => 'success',
            'message' => "{$count} mensaje(s) marcado(s) como leído(s).",
            'data'    => ['updated' => $count],
        ]);
    }

    private function errorResponse(string $message, int $status): JsonResponse
    {
        return response()->json([
            'status'  => 'error',
            'message' => $message,
            'data'    => null,
        ], $status);
    }
}
