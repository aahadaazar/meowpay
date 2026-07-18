import { z } from "zod";

export const moveTreatsSchema = z.object({
  senderWalletId: z.string().uuid("Choose a cat to send from."),
  receiverWalletId: z.string().uuid("Choose a cat to receive the treats."),
  amount: z.string().trim().regex(/^\d+$/, "Enter a whole number of treats.").transform(Number).pipe(z.number().int().positive("Amount must be at least 1.")),
  note: z.string().trim().max(280, "Keep notes to 280 characters or fewer.").transform((value) => value || null),
}).refine((value) => value.senderWalletId !== value.receiverWalletId, { message: "Choose a different recipient cat.", path: ["receiverWalletId"] });
