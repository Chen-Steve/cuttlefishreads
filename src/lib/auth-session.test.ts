import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { authSessionNeedsRefresh } from "./auth-session-refresh.ts";

const NOW = 1_700_000_000;

function encodeSession(session: object): string {
  const bytes = new TextEncoder().encode(JSON.stringify(session));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 = btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `base64-${base64}`;
}

function tokenWithExp(exp: number): string {
  const payload = encodeSession({ exp }).slice("base64-".length);
  return `header.${payload}.sig`;
}

describe("authSessionNeedsRefresh", () => {
  it("skips auth when the access token is still fresh", () => {
    const value = encodeSession({ expires_at: NOW + 3600 });
    assert.equal(
      authSessionNeedsRefresh(
        [{ name: "sb-project-auth-token", value }],
        NOW,
      ),
      false,
    );
  });

  it("refreshes when the token expires inside the window", () => {
    const value = encodeSession({ expires_at: NOW + 30 });
    assert.equal(
      authSessionNeedsRefresh(
        [{ name: "sb-project-auth-token", value }],
        NOW,
      ),
      true,
    );
  });

  it("rejoins chunked session cookies before reading expiry", () => {
    const value = encodeSession({ expires_at: NOW + 3600 });
    const splitAt = Math.floor(value.length / 2);
    assert.equal(
      authSessionNeedsRefresh(
        [
          { name: "sb-project-auth-token.0", value: value.slice(0, splitAt) },
          { name: "sb-project-auth-token.1", value: value.slice(splitAt) },
        ],
        NOW,
      ),
      false,
    );
  });

  it("uses the earlier of expires_at and the access token exp", () => {
    const value = encodeSession({
      expires_at: NOW + 3600,
      access_token: tokenWithExp(NOW + 20),
    });
    assert.equal(
      authSessionNeedsRefresh(
        [{ name: "sb-project-auth-token", value }],
        NOW,
      ),
      true,
    );
  });

  it("refreshes when the session cookie cannot be read", () => {
    assert.equal(
      authSessionNeedsRefresh(
        [{ name: "sb-project-auth-token", value: "base64-not-json" }],
        NOW,
      ),
      true,
    );
    assert.equal(
      authSessionNeedsRefresh(
        [{ name: "sb-project-auth-token-code-verifier", value: "verifier" }],
        NOW,
      ),
      true,
    );
  });
});
