export type CatOption = {
  id: string;
  name: string;
};

export type TransferDraft = {
  idempotencyKey: string;
  senderCatId: string;
  senderName: string;
  receiverCatId: string;
  receiverName: string;
  amount: number;
  note: string | null;
};
