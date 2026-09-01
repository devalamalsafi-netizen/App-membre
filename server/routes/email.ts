import { randomInt } from "node:crypto";
import nodemailer from "nodemailer";
import type { RequestHandler } from "express";

const PIN_TTL_MS = 10 * 60 * 1000;
const pinStore = new Map<string, { pin: string; expiresAt: number; used: boolean }>();

const smtpPort = Number(process.env.SMTP_PORT || 587);
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter.verify((error) => {
    if (error) {
      console.error("Erreur de connexion SMTP :", error.message);
    } else {
      console.info("Connexion SMTP OK, prêt à envoyer des emails.");
    }
  });
}

function cleanExpiredPins() {
  const now = Date.now();
  for (const [recipient, entry] of pinStore) {
    if (entry.expiresAt <= now) pinStore.delete(recipient);
  }
}

function generatePin() {
  return String(randomInt(100000, 1000000));
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildHtmlEmail({ name, message, pin }: { name?: string; message: string; pin: string }) {
  const safeName = escapeHtml(name || "un visiteur");
  const safeMessage = escapeHtml(message).replace(/\r?\n/g, "<br/>");

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;background:#f4f4f7;padding:20px}
.card{max-width:600px;margin:auto;background:#fff;border-radius:8px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,.08)}
h1{color:#2c3e50;font-size:20px}p{color:#444;line-height:1.5}.pin{display:inline-block;margin:16px 0;padding:12px 24px;font-size:28px;letter-spacing:6px;font-weight:bold;color:#fff;background:#2c3e50;border-radius:6px}.footer{margin-top:20px;font-size:12px;color:#999;text-align:center}
</style></head>
<body><div class="card"><h1>Nouveau message de ${safeName}</h1><p>${safeMessage}</p><p>Code de confirmation :</p><div class="pin">${pin}</div><p>Ce code expire dans 10 minutes et ne peut être utilisé qu'une seule fois.</p></div><div class="footer">Envoyé automatiquement depuis le site web</div></body>
</html>`;
}

export const handleSendEmail: RequestHandler = async (req, res) => {
  const { destinataire, sujet, nom, message } = req.body ?? {};

  if (typeof destinataire !== "string" || !destinataire.trim() || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ ok: false, error: "destinataire et message sont requis." });
  }

  const recipient = destinataire.trim().toLowerCase();
  cleanExpiredPins();
  const pin = generatePin();
  pinStore.set(recipient, { pin, expiresAt: Date.now() + PIN_TTL_MS, used: false });

  try {
    const info = await transporter.sendMail({
      from: `"${escapeHtml(nom || "Site Web")}" <${process.env.SMTP_USER}>`,
      to: recipient,
      subject: typeof sujet === "string" && sujet.trim() ? sujet.trim() : "Nouveau message depuis le site",
      html: buildHtmlEmail({ name: nom, message, pin }),
    });

    return res.json({ ok: true, id: info.messageId });
  } catch (error) {
    pinStore.delete(recipient);
    console.error("Erreur d'envoi email :", error);
    return res.status(500).json({ ok: false, error: "Échec de l'envoi de l'email." });
  }
};

export const handleVerifyPin: RequestHandler = (req, res) => {
  const { destinataire, pin } = req.body ?? {};

  if (typeof destinataire !== "string" || !destinataire.trim() || pin === undefined || pin === null || String(pin).trim() === "") {
    return res.status(400).json({ ok: false, error: "destinataire et pin sont requis." });
  }

  cleanExpiredPins();
  const recipient = destinataire.trim().toLowerCase();
  const entry = pinStore.get(recipient);

  if (!entry) {
    return res.status(400).json({ ok: false, error: "Aucun PIN actif pour cette adresse (expiré ou jamais envoyé)." });
  }
  if (entry.used) {
    return res.status(400).json({ ok: false, error: "Ce PIN a déjà été utilisé." });
  }
  if (entry.pin !== String(pin).trim()) {
    return res.status(400).json({ ok: false, error: "PIN incorrect." });
  }

  entry.used = true;
  pinStore.delete(recipient);
  return res.json({ ok: true, message: "Confirmation réussie." });
};
