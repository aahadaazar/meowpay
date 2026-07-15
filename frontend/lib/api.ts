export type CatSummary = {
  id: string;
  name: string;
  balance: number;
  createdAt: string;
};

export type Me = {
  id: string;
  email: string | null;
  displayName: string;
  cats: CatSummary[];
};

type ApiError = {
  code: string;
  message: string;
};

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

async function request<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${backendUrl}/api${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(error?.message ?? "MeowPay could not complete that request.");
  }

  return response.json() as Promise<T>;
}

export function getMe(accessToken: string): Promise<Me> {
  return request<Me>("/me", accessToken);
}

export function createCat(accessToken: string, name: string): Promise<CatSummary> {
  return request<CatSummary>("/cats", accessToken, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}
