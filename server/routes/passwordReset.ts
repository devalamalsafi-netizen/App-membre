import { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase admin credentials.");
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
function normalizeIdentifier(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, "").toLowerCase() : "";
}
const TOKEN_TTL_MINUTES = 15;
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const SENDER_NAME = "Scoutisme Hassania Marocain";
const SENDER_EMAIL = process.env.SMTP_USER || "no-reply@shm.ma";
const RESET_BASE_URL = process.env.VITE_MEMBERS_PORTAL_URL || "";
const CONTACT_LINE = "Si vous ne recevez rien, vérifiez vos spams ou contactez Adnane Belkhadir (0675202336 / shmdevsafi@gmail.com).";
function escapeHtml(str: string): string {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
export const handleRequestPasswordReset: RequestHandler = async (req, res) => {
  const GENERIC_RESPONSE = { ok: true, message: "Si les informations sont correctes, un e-mail a été envoyé." };
  try {
    const { first_name, last_name, generated_id, uuid, guardian_cin, email } = req.body || {};
    if (!first_name || !last_name || !generated_id || !uuid || !guardian_cin || !email) return res.status(400).json({ ok: false, error: "Tous les champs sont requis." });
    const adminClient = getSupabaseAdminClient();
    const { data: user, error } = await adminClient.from("users").select("id, first_name, last_name, generated_id, guardian_cin, user_email").eq("id", normalizeIdentifier(uuid)).eq("generated_id", normalizeIdentifier(generated_id)).maybeSingle();
    if (error) {
      console.info("[password-reset] user lookup", { hasError: true, userFound: user !== null });
      console.error("Erreur recherche utilisateur (reset password):", error);
      return res.json(GENERIC_RESPONSE);
    }
    console.info("[password-reset] user lookup", { hasError: false, userFound: user !== null });
    const normalizedUserFirstName = user ? normalizeIdentifier(user.first_name) : "";
    const normalizedUserLastName = user ? normalizeIdentifier(user.last_name) : "";
    const normalizedUserGuardianCin = user ? normalizeIdentifier(user.guardian_cin) : "";
    const normalizedUserEmail = user ? normalizeIdentifier(user.user_email) : "";
    const matches = user && normalizedUserFirstName === normalizeIdentifier(first_name) && normalizedUserLastName === normalizeIdentifier(last_name) && normalizedUserGuardianCin === normalizeIdentifier(guardian_cin) && normalizedUserEmail === normalizeIdentifier(email);
    if (!matches) {
      console.info("[password-reset] identity comparison", {
        userFound: user !== null,
        firstName: { provided: normalizeIdentifier(first_name), stored: normalizedUserFirstName, matches: normalizedUserFirstName === normalizeIdentifier(first_name) },
        lastName: { provided: normalizeIdentifier(last_name), stored: normalizedUserLastName, matches: normalizedUserLastName === normalizeIdentifier(last_name) },
        guardianCin: { provided: normalizeIdentifier(guardian_cin), stored: normalizedUserGuardianCin, matches: normalizedUserGuardianCin === normalizeIdentifier(guardian_cin) },
        email: { matches: normalizedUserEmail === normalizeIdentifier(email) },
      });
      return res.json(GENERIC_RESPONSE);
    }
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000).toISOString();
    const { data: tokenRow, error: tokenError } = await adminClient.from("password_reset_tokens").insert({ user_id: user.id, expires_at: expiresAt }).select("token").single();
    if (tokenError || !tokenRow) { console.error("Erreur création token reset:", tokenError); return res.json(GENERIC_RESPONSE); }
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) { console.error("BREVO_API_KEY manquante (reset password)"); return res.json(GENERIC_RESPONSE); }
    const resetUrl = `${RESET_BASE_URL}/reset-password?token=${tokenRow.token}`;
    const htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1f2937;"><h2 style="color:#7c2d12;">Réinitialisation de votre mot de passe</h2><p>Bonjour ${escapeHtml(user.first_name)} ${escapeHtml(user.last_name)},</p><p>Vous avez demandé la réinitialisation de votre mot de passe. Ce lien est valable <strong>${TOKEN_TTL_MINUTES} minutes</strong> :</p><p><a href="${resetUrl}" style="display:inline-block; margin: 12px 0; padding: 10px 18px; background:#7c2d12; color:#fff; text-decoration:none; border-radius:6px;">Réinitialiser mon mot de passe</a></p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p><hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" /><p style="font-size: 13px; color: #6b7280;">${CONTACT_LINE}</p></div>`;
    const brevoResponse = await fetch(BREVO_API_URL, { method: "POST", headers: { accept: "application/json", "content-type": "application/json", "api-key": apiKey }, body: JSON.stringify({ sender: { name: SENDER_NAME, email: SENDER_EMAIL }, to: [{ email: user.user_email, name: `${user.first_name} ${user.last_name}`.trim() }], subject: "Réinitialisation de votre mot de passe", htmlContent }) });
    if (!brevoResponse.ok) console.error("Erreur Brevo (reset password):", brevoResponse.status, await brevoResponse.json().catch(() => ({})));
    return res.json(GENERIC_RESPONSE);
  } catch (error) { console.error("Erreur handleRequestPasswordReset:", error); return res.json(GENERIC_RESPONSE); }
};
export const handleResetPassword: RequestHandler = async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword || String(newPassword).length < 6) return res.status(400).json({ ok: false, error: "Token ou mot de passe invalide." });
    const adminClient = getSupabaseAdminClient();
    const { data: tokenRow, error: tokenError } = await adminClient.from("password_reset_tokens").select("id, user_id, expires_at, used").eq("token", token).maybeSingle();
    if (tokenError || !tokenRow) return res.status(400).json({ ok: false, error: "Lien invalide ou expiré." });
    if (tokenRow.used) return res.status(400).json({ ok: false, error: "Ce lien a déjà été utilisé." });
    if (new Date(tokenRow.expires_at).getTime() < Date.now()) return res.status(400).json({ ok: false, error: "Ce lien a expiré." });
    const passwordHash = await bcrypt.hash(newPassword, 12);
    const { error: updateError } = await adminClient.from("users").update({ password: passwordHash }).eq("id", tokenRow.user_id);
    if (updateError) { console.error("Erreur mise à jour mot de passe:", updateError); return res.status(500).json({ ok: false, error: "Erreur serveur." }); }
    await adminClient.from("password_reset_tokens").update({ used: true }).eq("id", tokenRow.id);
    return res.json({ ok: true, message: "Mot de passe mis à jour avec succès." });
  } catch (error) { console.error("Erreur handleResetPassword:", error); return res.status(500).json({ ok: false, error: "Erreur serveur." }); }
};
