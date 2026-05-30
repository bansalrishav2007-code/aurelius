import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { resolveMemberSession, getPendingInviteFromCookie } from "./service.server";

export const getAuthSession = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  return resolveMemberSession(request.headers.get("cookie"));
});

export const getPendingInvite = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  return getPendingInviteFromCookie(request.headers.get("cookie"));
});
