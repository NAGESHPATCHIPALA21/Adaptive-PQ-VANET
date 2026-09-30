/**
 * Web Crypto API standard HMAC-SHA256 Implementation
 * Ensures 100% cryptographic compatibility with Python hmac.new(key, msg, hashlib.sha256).hexdigest()
 */

export async function computeAuthResponseHex(secretHex, anonymousId, challengeNonce, timestamp) {
  const messageStr = `${challengeNonce}:${anonymousId}:${Number(timestamp).toFixed(4)}`;
  const enc = new TextEncoder();
  
  const keyData = enc.encode(secretHex);
  const msgData = enc.encode(messageStr);

  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: { name: "SHA-256" } },
    false,
    ["sign"]
  );

  const signatureBuffer = await window.crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    msgData
  );

  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
