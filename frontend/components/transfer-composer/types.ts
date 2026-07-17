export type CatOption = {
  walletId: string;
  name: string;
  balance?: number;
};

export type TransferDraft = {
  idempotencyKey: string;
  senderWalletId: string;
  senderName: string;
  receiverWalletId: string;
  receiverName: string;
  amount: number;
  note: string | null;
};
