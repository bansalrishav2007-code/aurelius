/**
 * Data ownership contract — every persisted record MUST include:
 * - memberId (user_id) — primary isolation key for encrypted stores
 * - memberEmail — primary isolation key for JSON domain stores
 *
 * File-based stores (no SQL) mirror relational FK scoping:
 * - aurelius-wealth.json → profiles[].memberEmail
 * - aurelius-goals.json → goals[].ownerEmail + memberId where added
 * - aurelius-vault.json → documents[].memberEmail
 * - aurelius-conversations.json → conversations[].memberEmail
 * - aurelius-family.json → members[].ownerEmail
 * - aurelius-legal-entities.json → entities[].ownerEmail
 * - aurelius-member-preferences.json → preferences[].memberId + memberEmail
 * - aurelius-notifications.json → notifications[].memberId + memberEmail
 * - aurelius-audit.json → events[].memberId + memberEmail
 * - user-vault/{memberId}/* → encrypted blobs keyed by memberId
 *
 * All member APIs MUST use requireMemberSession() and assertMemberOwnsResource()
 * before returning or mutating data.
 */

export const MEMBER_SCOPED_STORES = [
  "aurelius-wealth.json",
  "aurelius-goals.json",
  "aurelius-vault.json",
  "aurelius-conversations.json",
  "aurelius-family.json",
  "aurelius-legal-entities.json",
  "aurelius-succession.json",
  "aurelius-security.json",
  "aurelius-member-preferences.json",
  "aurelius-notifications.json",
  "aurelius-audit.json",
  "aurelius-member-sessions.json",
] as const;
