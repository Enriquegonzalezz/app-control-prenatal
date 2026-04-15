<?php

declare(strict_types=1);

namespace App\Http\Controllers\Chat;

use App\Enums\MessageType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Chat\SendMessageRequest;
use App\Models\DoctorPatientRelationship;
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
