/** Create a private Daily.co room for a consultation. Falls back to placeholder when API key is not set. */
export async function createDailyRoom(
  bookingId: string,
  expiresAtMs?: number,
): Promise<{ url: string; roomName: string }> {
  const roomName = `aurelius-${bookingId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 40)}`;
  const apiKey = process.env.DAILY_API_KEY?.trim();
  const exp = Math.floor((expiresAtMs ?? Date.now() + 4 * 60 * 60_000) / 1000);

  if (!apiKey) {
    return {
      url: `https://aurelius.daily.co/${roomName}`,
      roomName,
    };
  }

  const res = await fetch("https://api.daily.co/v1/rooms", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: roomName,
      privacy: "private",
      properties: {
        enable_chat: true,
        enable_screenshare: true,
        start_video_off: false,
        start_audio_off: false,
        max_participants: 3,
        enable_recording: false,
        exp,
      },
    }),
  });

  if (!res.ok) {
    return {
      url: `https://aurelius.daily.co/${roomName}`,
      roomName,
    };
  }

  const data = (await res.json()) as { url?: string; name?: string };
  return {
    url: data.url ?? `https://aurelius.daily.co/${roomName}`,
    roomName: data.name ?? roomName,
  };
}
