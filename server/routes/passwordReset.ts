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
  "Identité non vérifiée. Vérifiez votre UUID, le CIN du parent et l’adresse e-mail.";

async function notifyPasswordReset(email: string, name: string, uuid: string) {
  const subject = "Mot de passe réinitialisé - Scoutisme Hassania";
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#1f2937"><h2>Mot de passe réinitialisé</h2><p>Bonjour ${escapeHtml(name)},</p><p>Votre mot de passe a été réinitialisé. Utilisez votre UUID comme nouveau mot de passe lors de votre prochaine connexion.</p><p><strong>UUID :</strong> ${escapeHtml(uuid)}</p><p>Si vous n’êtes pas à l’origine de cette demande, contactez immédiatement l’administrateur.</p></div>`;
  const brevoApiKey = process.env.BREVO_API_KEY;

  if (brevoApiKey) {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify({
        sender: {
          name: "Scoutisme Hassania Marocain",
          email: process.env.SMTP_USER || "no-reply@shm.ma",
        },
        to: [{ email, name }],
        subject,
        htmlContent: html,
      }),
    });
    if (response.ok) return true;
    console.error("Erreur Brevo (notification reset):", response.status, await response.text());
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: `"Scoutisme Hassania" <${process.env.SMTP_USER}>`,
      to: email,
      subject,
      html,
    });
    return true;
  }

  console.warn("Aucun fournisseur e-mail configuré pour la notification de reset.");
  return false;
}

export const handleRequestPasswordReset: RequestHandler = async (req, res) => {
  try {
    const { uuid, guardian_cin, email } = req.body || {};
    const normalizedUuid = typeof uuid === "string" ? uuid.trim() : "";
    const normalizedGuardianCin = normalize(guardian_cin);
    const normalizedEmail = normalize(email);

    if (!normalizedUuid || !normalizedGuardianCin || !normalizedEmail) {
      return res.status(400).json({ ok: false, error: "UUID, CIN du parent et e-mail sont requis." });
    }

    const adminClient = getSupabaseAdminClient();
    const { data: user, error } = await adminClient
      .from("users")
      .select("id, first_name, last_name, guardian_cin, email")
      .eq("id", normalizedUuid)
      .maybeSingle();

    if (error) {
      console.error("Erreur recherche utilisateur (reset password):", error);
      return res.status(500).json({ ok: false, error: "Impossible de vérifier votre identité." });
    }

    if (
      !user ||
      normalize(user.guardian_cin) !== normalizedGuardianCin ||
      normalize(user.email) !== normalizedEmail
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

    let emailSent = false;
    try {
      emailSent = await notifyPasswordReset(
        String(user.email),
        `${user.first_name || ""} ${user.last_name || ""}`.trim(),
        normalizedUuid,
      );
    } catch (notificationError) {
      console.error("Erreur notification reset password:", notificationError);
    }

    return res.json({
      ok: true,
      emailSent,
      message: emailSent
        ? "Mot de passe réinitialisé. Un e-mail de confirmation a été envoyé."
        : "Mot de passe réinitialisé. Vous pouvez vous connecter avec votre UUID.",
    });
  } catch (error) {
    console.error("Erreur handleRequestPasswordReset:", error);
    return res.status(500).json({ ok: false, error: "Impossible de traiter la demande." });
  }
};

export const handleResetPassword: RequestHandler = async (req, res) => {
  return res.status(410).json({
    ok: false,
    error: "Ce lien n’est plus utilisé. Recommencez la réinitialisation avec votre UUID et le CIN du parent.",
  });
};
