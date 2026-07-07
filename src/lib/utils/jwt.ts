import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "fallback-dev-secret-change-in-production"
);

// ---------------------------------------------------------------------------
// Admin JWT
// ---------------------------------------------------------------------------
export interface JWTPayload {
  sub: string; // admin id
  name: string;
  email: string;
  role: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getAuthAdmin(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

// ---------------------------------------------------------------------------
// Student JWT
// ---------------------------------------------------------------------------
export interface StudentJWTPayload {
  sub: string;   // student _id
  name: string;
  phone: string; // studentPhone
  type: "student";
}

export async function signStudentToken(
  payload: StudentJWTPayload
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("60d")
    .sign(SECRET);
}

export async function verifyStudentToken(
  token: string
): Promise<StudentJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    const p = payload as unknown as StudentJWTPayload;
    if (p.type !== "student") return null;
    return p;
  } catch {
    return null;
  }
}

export async function getAuthStudent(): Promise<StudentJWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("student_token")?.value;
  if (!token) return null;
  return verifyStudentToken(token);
}
