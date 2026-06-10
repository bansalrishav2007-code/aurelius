export type SupportTicketStatus = "open" | "resolved";

export type SupportReply = {
  from: "founder" | "customer";
  message: string;
  at: string;
};

export type SupportTicket = {
  id: string;
  type: "contact" | "support" | "query";
  name: string;
  email: string;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  createdAt: string;
  resolvedAt?: string;
  replies: SupportReply[];
};

export type SupportStore = {
  tickets: SupportTicket[];
};
