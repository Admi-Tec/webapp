import { describe, expect, it } from "vitest";
import { isValidEmailFormat, translateAuthError } from "@/lib/auth-error-messages";

describe("translateAuthError", () => {
  it("contraseña débil/filtrada por código", () => {
    expect(translateAuthError({ code: "weak_password" })).toMatch(/insegura|filtraciones/);
  });

  it("contraseña débil/filtrada detectada por mensaje (pwned)", () => {
    expect(translateAuthError({ message: "Password has been pwned" })).toMatch(/insegura/);
  });

  it("cuenta de Google ya vinculada a otro usuario", () => {
    expect(translateAuthError({ code: "identity_already_exists" })).toBe(
      "Esa cuenta de Google ya está vinculada a otro usuario.",
    );
  });

  it("correo ya tiene cuenta (identity already linked)", () => {
    expect(translateAuthError({ message: "Identity is already linked to another user" })).toMatch(
      /Ese correo ya tiene una cuenta/,
    );
  });

  it("usuario ya existe (already registered)", () => {
    expect(translateAuthError({ message: "User already registered" })).toBe(
      "Ya existe una cuenta con ese correo. Intenta ingresar.",
    );
  });

  it("email con formato inválido", () => {
    expect(translateAuthError({ code: "email_address_invalid" })).toBe(
      "El correo no tiene un formato válido.",
    );
  });

  it("rate limit por reenvíos de correo", () => {
    expect(translateAuthError({ code: "over_email_send_rate_limit" })).toMatch(
      /Demasiados intentos/,
    );
  });

  it("registro deshabilitado", () => {
    expect(translateAuthError({ code: "signup_disabled" })).toBe(
      "El registro está deshabilitado temporalmente.",
    );
  });

  it("credenciales inválidas al iniciar sesión", () => {
    expect(translateAuthError({ code: "invalid_credentials" })).toBe(
      "Correo o contraseña incorrectos.",
    );
  });

  it("contraseña demasiado corta (mensaje crudo de Supabase)", () => {
    expect(translateAuthError({ message: "Password should be at least 6 characters" })).toBe(
      "La contraseña es demasiado corta. Usa al menos 8 caracteres.",
    );
  });

  it("nueva contraseña igual a la actual (código)", () => {
    expect(translateAuthError({ code: "same_password" })).toBe(
      "La nueva contraseña debe ser distinta a la actual.",
    );
  });

  it("nueva contraseña igual a la actual (mensaje crudo de Supabase)", () => {
    expect(
      translateAuthError({ message: "New password should be different from the old password." }),
    ).toBe("La nueva contraseña debe ser distinta a la actual.");
  });

  it("error sin código ni mapeo conocido: usa el mensaje crudo", () => {
    expect(translateAuthError({ message: "Algo raro pasó" })).toBe("Algo raro pasó");
  });

  it("error sin código, sin mensaje ni forma reconocible: mensaje genérico", () => {
    expect(translateAuthError(null)).toBe("Algo salió mal. Inténtalo de nuevo.");
    expect(translateAuthError(undefined)).toBe("Algo salió mal. Inténtalo de nuevo.");
    expect(translateAuthError({})).toBe("Algo salió mal. Inténtalo de nuevo.");
  });
});

describe("isValidEmailFormat", () => {
  it("acepta un correo con formato válido", () => {
    expect(isValidEmailFormat("ana@gmail.com")).toBe(true);
  });

  it("rechaza correos sin arroba, sin dominio o con espacios", () => {
    expect(isValidEmailFormat("ana.gmail.com")).toBe(false);
    expect(isValidEmailFormat("ana@gmail")).toBe(false);
    expect(isValidEmailFormat("ana @gmail.com")).toBe(false);
    expect(isValidEmailFormat("")).toBe(false);
  });
});
