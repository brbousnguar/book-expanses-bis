/**
 * Cognito auth — sign in, sign out, get token (docs/spec.md, ADR-0002).
 * Uses UserPoolId and UserPoolClientId from env.
 */

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  type CognitoUserSession,
} from "amazon-cognito-identity-js";

const poolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? "";
const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "";

const userPool =
  poolId && clientId
    ? new CognitoUserPool({ UserPoolId: poolId, ClientId: clientId })
    : null;

export function getCurrentUser(): CognitoUser | null {
  if (!userPool) return null;
  return userPool.getCurrentUser();
}

export function getSession(): Promise<CognitoUserSession | null> {
  return new Promise((resolve) => {
    const user = getCurrentUser();
    if (!user) {
      resolve(null);
      return;
    }
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err) {
        resolve(null);
        return;
      }
      resolve(session);
    });
  });
}

export async function getIdToken(): Promise<string | null> {
  const session = await getSession();
  if (!session?.isValid()) return null;
  return session.getIdToken().getJwtToken();
}

export function signIn(email: string, password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!userPool) {
      reject(new Error("Cognito not configured"));
      return;
    }
    const user = new CognitoUser({
      Username: email,
      Pool: userPool,
    });
    user.authenticateUser(
      new AuthenticationDetails({ Username: email, Password: password }),
      {
        onSuccess: (session) => {
          resolve(session.getIdToken().getJwtToken());
        },
        onFailure: (err) => reject(err),
        newPasswordRequired: () => reject(new Error("New password required")),
      }
    );
  });
}

export function signOut(): void {
  const user = getCurrentUser();
  if (user) user.signOut();
}

export function isConfigured(): boolean {
  return Boolean(poolId && clientId);
}

/** True when using local backend (localhost) — skip Cognito, no login required */
export function isLocalApi(): boolean {
  if (typeof window !== "undefined" && window.location?.hostname === "localhost") {
    return true;
  }
  const url = process.env.NEXT_PUBLIC_API_URL ?? "";
  return url.includes("localhost");
}
