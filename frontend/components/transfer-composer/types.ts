export type CatOption = {
  walletId: string;
  name: string;
  balance?: number;
  ownerName?: string;
};

export function catOptionLabel(cat: CatOption, isOwnedByViewer: boolean): string {
  return `${cat.name} — ${isOwnedByViewer ? "You" : cat.ownerName ?? "Unknown owner"}`;
}

export type TransferDraft = {
  idempotencyKey: string;
  senderWalletId: string;
  senderName: string;
  receiverWalletId: string;
  receiverName: string;
  amount: number;
  note: string | null;
};
