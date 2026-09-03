import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { apiUrl } from "@/lib/api-config";

export default function ForgotPassword() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    generatedId: "",
    uuid: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(apiUrl("/api/auth/request-password-reset"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          generated_id: formData.generatedId,
          uuid: formData.uuid,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Impossible de réinitialiser le mot de passe.");
      }
      setSubmitted(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Impossible de réinitialiser le mot de passe.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto space-y-6" dir="rtl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">استعادة كلمة المرور</h1>
          <p className="text-gray-600">أدخل معلومات العضو للتحقق من هويتك</p>
        </div>

        {!submitted ? (
          <div className="bg-white rounded-lg shadow-lg border-r-4 border-red-600 p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-sm font-bold text-gray-700">
                الاسم الشخصي
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(event) => updateField("firstName", event.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600"
                />
              </label>
              <label className="block text-sm font-bold text-gray-700">
                الاسم العائلي
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(event) => updateField("lastName", event.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600"
                />
              </label>
              <label className="block text-sm font-bold text-gray-700">
                المعرف (ID)
                <input
                  type="text"
                  value={formData.generatedId}
                  onChange={(event) => updateField("generatedId", event.target.value)}
                  required
                  dir="ltr"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600"
                />
              </label>
              <label className="block text-sm font-bold text-gray-700">
                UUID للتأكيد
                <input
                  type="text"
                  value={formData.uuid}
                  onChange={(event) => updateField("uuid", event.target.value)}
                  required
                  dir="ltr"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600"
                />
              </label>
              {error && <p className="text-red-600 text-sm text-center">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-l from-red-600 to-purple-600 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50"
              >
                {loading ? "جاري التحقق..." : "إعادة تعيين كلمة المرور"}
              </button>
              <div className="text-center">
                <Link to="/login" className="text-purple-600 font-bold hover:underline">
                  العودة إلى تسجيل الدخول
                </Link>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg border-r-4 border-green-600 p-8 text-center space-y-4">
            <div className="text-5xl">✓</div>
            <h2 className="text-2xl font-bold text-gray-800">تم تحديث كلمة المرور</h2>
            <p className="text-gray-600">يمكنك الآن تسجيل الدخول باستعمال UUID ككلمة مرور.</p>
            <Link to="/login" className="inline-block text-purple-600 font-bold hover:underline">
              العودة إلى تسجيل الدخول
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
