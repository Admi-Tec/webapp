// Chromium/Firefox render the native HTML5 constraint-validation bubble
// ("Please fill out this field", "Please match the requested format", ...)
// in the browser/OS UI language — it ignores this document's `lang="es"`
// entirely. That's why a French-locale browser shows French text on a
// required/min/max/email field even though every string in this app is
// Spanish. `setCustomValidity` is the only way to override that bubble's
// text, so every native-validated <input>/<textarea> routes through this.
export function getSpanishValidationMessage(
  target: HTMLInputElement | HTMLTextAreaElement,
): string {
  const v = target.validity;
  if (v.valid) return "";
  if (v.valueMissing) return "Completa este campo.";
  if (v.typeMismatch) {
    if (target.type === "email") return "Ingresa un correo electrónico válido.";
    if (target.type === "url") return "Ingresa una URL válida.";
    return "El formato no es válido.";
  }
  if (v.tooShort) return `Debe tener al menos ${target.minLength} caracteres.`;
  if (v.tooLong) return `Debe tener como máximo ${target.maxLength} caracteres.`;
  if (v.rangeUnderflow)
    return `El valor debe ser mayor o igual a ${(target as HTMLInputElement).min}.`;
  if (v.rangeOverflow)
    return `El valor debe ser menor o igual a ${(target as HTMLInputElement).max}.`;
  if (v.stepMismatch) return "El valor no es válido para el incremento permitido.";
  if (v.patternMismatch) return "El formato no es válido.";
  if (v.badInput) return "Ingresa un valor válido.";
  return "Este campo no es válido.";
}

export function handleNativeInvalid(e: React.InvalidEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.setCustomValidity(getSpanishValidationMessage(e.currentTarget));
}

// The custom message set by handleNativeInvalid persists across re-checks
// until cleared, so every edit must reset it before native validation runs
// again (e.g. on the next submit) — otherwise a fixed field stays "invalid".
export function clearNativeValidity(
  e: React.SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>,
) {
  e.currentTarget.setCustomValidity("");
}
