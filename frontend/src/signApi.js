import { API_BASE_URL } from "./config";


export async function translateLandmarks({ landmarks, roomId, sender }) {
  const response = await fetch(`${API_BASE_URL}/translate/landmarks/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ landmarks, roomId, sender }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Unable to translate hand landmarks.");
  }

  return response.json();
}


export async function fetchAvailableSigns() {
  const response = await fetch(`${API_BASE_URL}/signs/`);
  if (!response.ok) {
    throw new Error("Unable to fetch available signs.");
  }
  return response.json();
}
