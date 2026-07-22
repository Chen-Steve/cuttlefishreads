export const PASSWORD_RECOVERY_COOKIE = "password_recovery";

/** Short-lived flag set only after a recovery email link is exchanged. */
export const passwordRecoveryCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60, // 1 hour
};
