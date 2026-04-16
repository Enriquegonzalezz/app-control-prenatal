<?php

declare(strict_types=1);

namespace App\Services;

use RuntimeException;

/**
 * Cifrado AES-256-CBC para mensajes de chat.
 *
 * Formato almacenado: base64(iv) . ':' . base64(ciphertext)
 * La clave se lee de CHAT_ENCRYPTION_KEY (.env) — debe ser exactamente 32 bytes.
 */
final class ChatEncryptionService
{
    private const CIPHER = 'AES-256-CBC';
    private const IV_LEN = 16;

    private string $key;

    public function __construct()
    {
        $raw = config('app.chat_key', '');

        if (strlen($raw) !== 32) {
            throw new RuntimeException(
                'CHAT_ENCRYPTION_KEY debe tener exactamente 32 caracteres.'
            );
        }

        $this->key = $raw;
    }

    public function encrypt(string $plaintext): string
    {
        $iv         = random_bytes(self::IV_LEN);
        $ciphertext = openssl_encrypt($plaintext, self::CIPHER, $this->key, OPENSSL_RAW_DATA, $iv);

        if ($ciphertext === false) {
            throw new RuntimeException('Error al cifrar el mensaje.');
        }

        return base64_encode($iv) . ':' . base64_encode($ciphertext);
    }

    public function decrypt(string $encrypted): string
    {
        [$ivB64, $ciphertextB64] = explode(':', $encrypted, 2) + ['', ''];

        $iv         = base64_decode($ivB64, true);
        $ciphertext = base64_decode($ciphertextB64, true);

        if ($iv === false || $ciphertext === false) {
            throw new RuntimeException('Formato de mensaje cifrado inválido.');
        }

        $plaintext = openssl_decrypt($ciphertext, self::CIPHER, $this->key, OPENSSL_RAW_DATA, $iv);

        if ($plaintext === false) {
            throw new RuntimeException('Error al descifrar el mensaje.');
        }

        return $plaintext;
    }
}
