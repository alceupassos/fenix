/**
 * Cadastro — pure validation + in-memory user store.
 * DB persistence is handled by the API route when FENIX_DATABASE_URL is set.
 * Never log full CPF (use maskCpf).
 */

import type { VerificationStatus } from "@/lib/kyc-contracts";
import { maskCpf } from "@/lib/crypto/vault-crypto";
import { isValidCpf, onlyDigits } from "@/lib/validators/cpf-cnpj";

export type OnboardingStep = "dados" | "documentos" | "facial" | "pronto";

export type RegisteredUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  /** Digits only (11). Sensitive — mask in logs. */
  cpf: string;
  passwordHash: string;
  role: "user";
  verificationStatus: VerificationStatus;
  onboardingStep: OnboardingStep;
  createdAt: Date;
  updatedAt: Date;
};

export type RegisterInput = {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  password: string;
};

export type ValidationError = {
  field: string;
  message: string;
};

export type ValidationResult =
  | { ok: true; data: NormalizedRegister }
  | { ok: false; errors: ValidationError[] };

export type NormalizedRegister = {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  password: string;
};

/** In-memory registered users (local / no-DB). Keyed by id. */
const memoryUsersById = new Map<string, RegisteredUser>();
const memoryUsersByEmail = new Map<string, RegisteredUser>();
const memoryUsersByCpf = new Map<string, RegisteredUser>();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string): string {
  return onlyDigits(phone);
}

/** Brazilian mobile/landline: 10 or 11 digits (DDD + number). */
export function isValidBrPhone(phone: string): boolean {
  const d = onlyDigits(phone);
  if (d.length !== 10 && d.length !== 11) return false;
  // DDD 11–99
  const ddd = parseInt(d.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;
  if (d.length === 11) {
    // Mobile typically starts with 9
    return d[2] === "9";
  }
  return true;
}

export function isValidEmail(email: string): boolean {
  const e = email.trim();
  // Practical RFC-ish check (not full RFC 5322)
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254;
}

export function validateRegisterInput(input: {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  cpf?: unknown;
  password?: unknown;
}): ValidationResult {
  const errors: ValidationError[] = [];

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email : "";
  const phone = typeof input.phone === "string" ? input.phone : "";
  const cpf = typeof input.cpf === "string" ? input.cpf : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (name.length < 2) {
    errors.push({ field: "name", message: "Informe seu nome completo." });
  } else if (name.length > 120) {
    errors.push({ field: "name", message: "Nome muito longo." });
  }

  if (!isValidEmail(email)) {
    errors.push({ field: "email", message: "Informe um e-mail válido." });
  }

  if (!isValidBrPhone(phone)) {
    errors.push({ field: "phone", message: "Informe um telefone brasileiro válido com DDD." });
  }

  if (!isValidCpf(cpf)) {
    errors.push({ field: "cpf", message: "CPF inválido." });
  }

  if (password.length < 8) {
    errors.push({ field: "password", message: "A senha deve ter no mínimo 8 caracteres." });
  } else if (password.length > 128) {
    errors.push({ field: "password", message: "Senha muito longa." });
  }

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    data: {
      name,
      email: normalizeEmail(email),
      phone: normalizePhone(phone),
      cpf: onlyDigits(cpf),
      password,
    },
  };
}

export type CreateUserInput = {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  passwordHash: string;
  id?: string;
};

export type CreateUserResult =
  | { ok: true; user: RegisteredUser }
  | { ok: false; reason: "email_taken" | "cpf_taken" };

function newId(): string {
  return `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Create user in the in-memory map.
 * Logs only masked CPF.
 */
export function createUserInMemory(input: CreateUserInput): CreateUserResult {
  const email = normalizeEmail(input.email);
  const cpf = onlyDigits(input.cpf);

  if (memoryUsersByEmail.has(email)) {
    console.info("[register] email already registered");
    return { ok: false, reason: "email_taken" };
  }
  if (memoryUsersByCpf.has(cpf)) {
    console.info("[register] cpf already registered", maskCpf(cpf));
    return { ok: false, reason: "cpf_taken" };
  }

  const now = new Date();
  const user: RegisteredUser = {
    id: input.id ?? newId(),
    name: input.name.trim(),
    email,
    phone: normalizePhone(input.phone),
    cpf,
    passwordHash: input.passwordHash,
    role: "user",
    verificationStatus: "nao_verificado",
    onboardingStep: "dados",
    createdAt: now,
    updatedAt: now,
  };

  memoryUsersById.set(user.id, user);
  memoryUsersByEmail.set(user.email, user);
  memoryUsersByCpf.set(user.cpf, user);

  console.info("[register] user created", user.id, maskCpf(user.cpf));
  return { ok: true, user };
}

export function findMemoryUserByEmail(email: string): RegisteredUser | null {
  return memoryUsersByEmail.get(normalizeEmail(email)) ?? null;
}

export function findMemoryUserById(id: string): RegisteredUser | null {
  return memoryUsersById.get(id) ?? null;
}

export function findMemoryUserByCpf(cpf: string): RegisteredUser | null {
  return memoryUsersByCpf.get(onlyDigits(cpf)) ?? null;
}

export function updateMemoryUser(
  id: string,
  patch: Partial<Pick<RegisteredUser, "phone" | "onboardingStep" | "name" | "verificationStatus">>,
): RegisteredUser | null {
  const user = memoryUsersById.get(id);
  if (!user) return null;
  const next: RegisteredUser = {
    ...user,
    ...patch,
    phone: patch.phone !== undefined ? normalizePhone(patch.phone) : user.phone,
    updatedAt: new Date(),
  };
  memoryUsersById.set(id, next);
  memoryUsersByEmail.set(next.email, next);
  memoryUsersByCpf.set(next.cpf, next);
  return next;
}

/** Safe profile projection — never exposes passwordHash or full raw internals beyond needed fields. */
export function toPublicProfile(user: RegisteredUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    /** Masked CPF for display */
    cpfMasked: maskCpf(user.cpf),
    role: user.role,
    verificationStatus: user.verificationStatus,
    onboardingStep: user.onboardingStep,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
