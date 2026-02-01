export const TABLE_NAME = process.env.TABLE_NAME ?? "BookTrackerTable";

export function getUserId(event: {
  requestContext?: {
    authorizer?: { jwt?: { claims?: { sub?: string } }; claims?: { sub?: string } };
  };
}): string | null {
  const claims = event.requestContext?.authorizer?.jwt?.claims ?? event.requestContext?.authorizer?.claims;
  return claims?.sub ?? null;
}
