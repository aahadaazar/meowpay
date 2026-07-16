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

export type ExecuteTransferInput = {
  idempotencyKey: string;
  senderCatId: string;
  receiverCatId: string;
  amount: number;
  note: string | null;
  source: "manual" | "agent";
};

export type TopupInput = {
  idempotencyKey: string;
  catId: string;
  amount: 100 | 500 | 1000;
};

export type TransferResponse = {
  id: string;
  idempotencyKey: string;
  senderCatId: string;
  receiverCatId: string;
  amount: number;
  note: string | null;
  source: "manual" | "agent" | "topup" | "welcome_grant";
  initiatedBy: string | null;
  status: "completed" | "failed";
  failureReason: string | null;
  createdAt: string;
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

export async function executeTransfer(accessToken: string, input: ExecuteTransferInput): Promise<TransferResponse> {
  const response = await fetch(`${backendUrl}/api/transfers/execute`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const body = (await response.json().catch(() => null)) as TransferResponse | ApiError | null;

  // Business failures are durable transfer outcomes. The API deliberately returns their row with
  // 422, so the UI can expose `failureReason` rather than replacing it with a generic error.
  if (response.status === 422 && body && "status" in body) {
    return body;
  }

  if (!response.ok) {
    throw new Error(body && "message" in body ? body.message : "MeowPay could not complete that request.");
  }

  return body as TransferResponse;
}

export function topUp(accessToken: string, input: TopupInput): Promise<TransferResponse> {
  return request<TransferResponse>("/wallet/topup", accessToken, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
