/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// These utilities are adapted from the user-provided LitElement example
// to handle audio encoding and decoding for the Gemini API on the client-side.

export function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

export function createAudioBlob(data: Float32Array): { data: string; mimeType: string; } {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        // convert float32 from -1 to 1 to int16 from -32768 to 32767
        int16[i] = data[i] * 32768;
    }

    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000', // The API expects 16kHz PCM audio
    };
}
