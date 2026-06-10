export type FamilyAccessLevel = "view" | "full";

export type FamilyMember = {
  id: string;
  ownerEmail: string;
  name: string;
  relation: string;
  pan?: string;
  dob?: string;
  accessLevel: FamilyAccessLevel;
  assetIds?: string[];
  unused80CLimit?: number;
  createdAt: string;
  updatedAt: string;
};

export type FamilyStore = {
  members: FamilyMember[];
  updatedAt?: string;
};
