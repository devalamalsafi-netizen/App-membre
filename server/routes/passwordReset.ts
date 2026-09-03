import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import type { RequestHandler } from "express";

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin credentials.");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function normalize(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, "").toLowerCase() : "";
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const IDENTITY_ERROR =
  "Identité non vérifiée. Vérifiez le nom, le prénom, l’ID et l’UUID.";

async function notifyPasswordReset(email: string, name: string, uuid: string) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (!smtpUser || !smtpPass) {
    throw new Error("SMTP_USER et SMTP_PASS doivent être configurés.");
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : true,
    auth: { user: smtpUser, pass: smtpPass },
  });
  const safeName = escapeHtml(name);
  const safeUuid = escapeHtml(uuid);

  await transporter.sendMail({
    from: `"Scoutisme Hassania" <${smtpUser}>`,
    to: email,
    subject: "Mot de passe réinitialisé - Scoutisme Hassania",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#1f2937"><h2>Mot de passe réinitialisé</h2><p>Bonjour ${safeName},</p><p>Votre mot de passe a été réinitialisé. Utilisez votre UUID comme nouveau mot de passe lors de votre prochaine connexion.</p><p><strong>UUID :</strong> ${safeUuid}</p><p>Si vous n’êtes pas à l’origine de cette demande, contactez immédiatement l’administrateur.</p></div>`,
  });
}

export const handleRequestPasswordReset: RequestHandler = async (req, res) => {
  try {
    const { first_name, last_name, generated_id, uuid } = req.body || {};
    const normalizedFirstName = normalize(first_name);
    const normalizedLastName = normalize(last_name);
    const normalizedGeneratedId = normalize(generated_id);
    const normalizedUuid = typeof uuid === "string" ? uuid.trim() : "";

    if (!normalizedFirstName || !normalizedLastName || !normalizedGeneratedId || !normalizedUuid) {
      return res.status(400).json({
        ok: false,
        error: "Nom, prénom, ID et UUID sont requis.",
      });
    }

    const adminClient = getSupabaseAdminClient();
    const { data: user, error } = await adminClient
      .from("users")
      .select("id, first_name, last_name, generated_id, email")
      .eq("id", normalizedUuid)
      .maybeSingle();

    if (error) {
      console.error("Erreur recherche utilisateur (reset password):", error);
      return res.status(500).json({ ok: false, error: "Impossible de vérifier votre identité." });
    }

    if (
      !user ||
      normalize(user.first_name) !== normalizedFirstName ||
      normalize(user.last_name) !== normalizedLastName ||
      normalize(user.generated_id) !== normalizedGeneratedId ||
      !normalize(user.email)
    ) {
      return res.status(400).json({ ok: false, error: IDENTITY_ERROR });
    }

    const passwordHash = await bcrypt.hash(normalizedUuid, 12);
    const { error: updateError } = await adminClient
      .from("users")
      .update({ password: passwordHash })
      .eq("id", user.id);

    if (updateError) {
      console.error("Erreur mise à jour mot de passe:", updateError);
      return res.status(500).json({ ok: false, error: "Impossible de mettre à jour le mot de passe." });
    }

    try {
      await notifyPasswordReset(
        String(user.email),
        `${user.first_name || ""} ${user.last_name || ""}`.trim(),
        normalizedUuid,
      );
    } catch (notificationError) {
      console.error("Erreur SMTP Gmail (notification reset):", notificationError);
    }

    return res.json({
      ok: true,
      message: "Mot de passe réinitialisé. Vous pouvez vous connecter avec votre UUID.",
    });
  } catch (error) {
    console.error("Erreur handleRequestPasswordReset:", error);
    return res.status(500).json({ ok: false, error: "Impossible de traiter la demande." });
  }
};

export const handleResetPassword: RequestHandler = async (_req, res) => {
  return res.status(410).json({
    ok: false,
    error: "Ce lien n’est plus utilisé. Recommencez avec votre nom, prénom, ID et UUID.",
  });
};
