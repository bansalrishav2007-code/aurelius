export type PaymentStatus = "pending" | "captured" | "failed";

export type PaymentRecord = {
  id: string;
  memberEmail: string;
  memberName: string;
  planId: string;
  planName: string;
  amountPaise: number;
  currency: string;
  status: PaymentStatus;
  orderId: string;
  createdAt: string;
  capturedAt?: string;
};

export type PaymentStore = {
  payments: PaymentRecord[];
};
