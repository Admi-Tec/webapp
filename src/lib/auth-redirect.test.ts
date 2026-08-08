import { describe, expect, it } from "vitest";
import { isPasswordRecoveryRedirect } from "./auth-redirect";

describe("isPasswordRecoveryRedirect", () => {
  it("recognizes a PKCE recovery callback from its dedicated pathname", () => {
    expect(isPasswordRecoveryRedirect("/restablecer-password", new URLSearchParams("code=abc"))).toBe(
      true,
    );
  });

  it("recognizes an implicit recovery callback by type", () => {
    expect(isPasswordRecoveryRedirect("/", new URLSearchParams("type=recovery"))).toBe(true);
  });

  it("does not confuse a normal PKCE confirmation with password recovery", () => {
    expect(isPasswordRecoveryRedirect("/", new URLSearchParams("code=abc"))).toBe(false);
  });
});
