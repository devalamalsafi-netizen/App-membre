import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { apiUrl } from "@/lib/api-config";

export default function ForgotPassword() {
  const [formData, setFormData] = useState({ firstName: "", lastName: "", generatedId: "", uuid: "", guardianCin: "", email: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, [field]: e.target.value }));
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const response = await fetch(apiUrl("/api/auth/request-password-reset"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ first_name: formData.firstName, last_name: formData.lastName, generated_id: formData.generatedId, uuid: formData.uuid, guardian_cin: formData.guardianCin, email: formData.email }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Erreur");
      setSubmitted(true);
    } catch (err) { console.error("Error:", err); setError(err instanceof Error ? err.message : "Veuillez contacter l’administrateur ou le développeur de l’application pour récupérer votre mot de passe."); } finally { setLoading(false); }
  };
  const fields = [{ key: "firstName", label: "الاسم الشخصي", type: "text" }, { key: "lastName", label: "الاسم العائلي", type: "text" }, { key: "generatedId", label: "المعرف (ID)", type: "text" }, { key: "uuid", label: "UUID", type: "text" }, { key: "guardianCin", label: "رقم بطاقة التعريف الوطنية للولي", type: "text" }, { key: "email", label: "البريد الإلكتروني", type: "email" }];
  return <Layout><div className="max-w-md mx-auto space-y-6" dir="rtl"><div className="text-center mb-8"><h1 className="text-3xl font-bold text-gray-800 mb-2">استعادة كلمة المرور</h1><p className="text-gray-600">أدخل معلوماتك للتحقق من هويتك</p></div>{!submitted ? <div className="bg-white rounded-lg shadow-lg border-r-4 border-gradient-to-b from-red-600 to-purple-600 p-8"><form onSubmit={handleSubmit} className="space-y-4">{fields.map(field => <div key={field.key}><label className="block text-sm font-bold text-gray-700 mb-2">{field.label}</label><input type={field.type} value={formData[field.key as keyof typeof formData]} onChange={handleChange(field.key)} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600" dir={field.key === "uuid" || field.key === "guardianCin" || field.key === "email" ? "ltr" : undefined} /></div>)}{error && <p className="text-red-600 text-sm text-center">{error}</p>}<button type="submit" disabled={loading} className="w-full bg-gradient-to-l from-red-600 to-purple-600 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50">{loading ? "جاري الإرسال..." : "إرسال رابط الاستعادة"}</button><div className="text-center"><Link to="/login" className="text-purple-600 font-bold hover:underline">العودة إلى تسجيل الدخول</Link></div></form></div> : <div className="bg-white rounded-lg shadow-lg border-r-4 border-green-600 p-8 text-center space-y-4"><div className="text-5xl">✓</div><h2 className="text-2xl font-bold text-gray-800">تم إرسال الرابط بنجاح</h2><p className="text-gray-600">تحقق من بريدك الإلكتروني وانقر على الرابط لاستعادة كلمة المرور (صالح لمدة 15 دقيقة)</p><p className="text-sm text-gray-500">إذا لم تتلقَّ أي رسالة، تحقق من مجلد الرسائل غير المرغوب فيها (Spam) أو تواصل مع Adnane Belkhadir (0675202336 / shmdevsafi@gmail.com)</p><Link to="/login" className="inline-block text-purple-600 font-bold hover:underline">العودة إلى تسجيل الدخول</Link></div>}</div></Layout>;
}
