const lowercase = "abcdefghijklmnopqrstuvwxyz";
const uppercase = lowercase.toUpperCase();
const digits = "0123456789";
const symbols = `~\`!@#$%^&*()_-+={[}]|\\:;"'<,>.?/`;

interface CharacterOptions {
  all?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
  digits?: boolean;
  symbols?: boolean;
  allowed?: string;
  disallowed?: string;
}

export function getRandomString(
  len: number,
  options: CharacterOptions = { lowercase: true }
): string {
  let allowed = "";

  if (options.allowed) {
    allowed = options.allowed;
  } else if (options.all) {
    allowed += lowercase + uppercase + digits + symbols;
  } else {
    if (options.lowercase) allowed += lowercase;
    if (options.uppercase) allowed += uppercase;
    if (options.digits) allowed += digits;
    if (options.symbols) allowed += symbols;
  }

  if (options.disallowed) {
    options.disallowed
      .split("")
      .forEach((c) => (allowed = allowed.replace(c, "")));
  }

  const retval = [];
  for (let i = 0; i < len; i++) {
    retval[i] = allowed[Math.floor(Math.random() * allowed.length)];
  }

  return retval.join("");
}

export function toBase64(str: string): string {
  return Buffer.from(str).toString("base64");
}

export function fromBase64(b64str: string): string {
  return Buffer.from(b64str, "base64").toString();
}
