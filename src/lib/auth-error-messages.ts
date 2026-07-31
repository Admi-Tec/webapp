// Mapea errores crudos de Supabase Auth (signUp/signInWithPassword/OAuth) a
// mensajes en español para el formulario de /auth. Sin imports de Supabase/
// server aquí, así que puede testearse directo — ver auth-error-messages.test.ts.
export function translateAuthError(err: unknown): string {
  const e = err as { code?: string; error_code?: string; message?: string } | null | undefined;
  const code: string | undefined = e?.code ?? e?.error_code;
  const msg: string = e?.message ?? "";
  const m = msg.toLowerCase();

  if (
    code === "weak_password" ||
    (m.includes("password") &&
      (m.includes("weak") ||
        m.includes("pwned") ||
        m.includes("leaked") ||
        m.includes("compromised")))
  ) {
    return "Esa contraseña es insegura o ha aparecido en filtraciones. Elige una más fuerte (mínimo 8 caracteres, mezcla letras, números y símbolos).";
  }
  if (code === "identity_already_exists") {
    return "Esa cuenta de Google ya está vinculada a otro usuario.";
  }
  if (
    code === "email_exists" ||
    m.includes("identity is already linked") ||
    (m.includes("identity") && m.includes("already"))
  ) {
    return "Ese correo ya tiene una cuenta. Si te registraste con contraseña, ingresa con ese método primero (o confirma tu correo si aún no lo hiciste) para poder vincular Google.";
  }
  if (
    code === "user_already_exists" ||
    m.includes("already registered") ||
    m.includes("already exists")
  ) {
    return "Ya existe una cuenta con ese correo. Intenta ingresar.";
  }
  if (code === "email_address_invalid" || m.includes("invalid email")) {
    return "El correo no tiene un formato válido.";
  }
  if (code === "over_email_send_rate_limit" || m.includes("rate limit")) {
    return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
  }
  if (code === "signup_disabled") {
    return "El registro está deshabilitado temporalmente.";
  }
  if (code === "invalid_credentials" || m.includes("invalid login credentials")) {
    return "Correo o contraseña incorrectos.";
  }
  if (m.includes("password should be at least")) {
    return "La contraseña es demasiado corta. Usa al menos 8 caracteres.";
  }
  return msg || "Algo salió mal. Inténtalo de nuevo.";
}

// Validación del formulario de "Olvidé mi contraseña" — mismo regex simple
// que ya usaba el formulario, extraído para poder testearlo directo.
export function isValidEmailFormat(value: string): boolean {
  return /^\S+@\S+\.\S+$/.test(value);
}
