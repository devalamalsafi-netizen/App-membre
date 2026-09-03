import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { hasPendingSyncItems } from "@/lib/offline/syncEngine";
import {
  ChevronLeft,
  User,
  LogOut,
  Home,
  FileText,
  Users,
  ClipboardCheck,
  DatabaseZap,
  IdCard,
} from "lucide-react";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { logout } = useAuth();

  const menuItems = [
    { label: "الرئيسية", icon: Home, path: "/dashboard", color: "text-blue-600" },
    { label: "ملفي الشخصي", icon: User, path: "/my-profile", color: "text-green-600" },
    { label: "العضوية", icon: IdCard, path: "/membership", color: "text-pink-600" },
    { label: "التقارير", icon: FileText, path: "/reports", color: "text-red-600" },
    { label: "حصص", icon: Users, path: "/sessions", color: "text-purple-600" },
    { label: "الحضور", icon: ClipboardCheck, path: "/attendance", color: "text-emerald-600" },
    { label: "مساحة التخزين", icon: DatabaseZap, path: "/sync-cache", color: "text-slate-600" },
    { label: "صناديق الأفكار", icon: FileText, path: "/ideas", color: "text-yellow-600" },
  ];

  return (
    <>
      <aside
        dir="rtl"
        className={`fixed right-0 top-0 h-screen w-64 bg-white border-r-4 border-scout-purple shadow-lg transition-transform duration-300 z-50 flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-[calc(100%-25px)]"
        }`}
      >
        <div className="h-20 flex items-center justify-center border-b border-gray-200 bg-gradient-to-b from-scout-purple to-purple-600">
          <div className="text-white text-center">
            <div className="text-2xl font-bold">ش</div>
            <div className="text-xs">كشاف</div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              const active = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 ${
                      active ? "bg-scout-purple text-white" : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <IconComponent size={24} className={active ? "text-white" : item.color} />
                    <span className="font-semibold">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-gray-200 p-4">
          <button
            onClick={async () => {
              const pending = await hasPendingSyncItems();
              if (
                pending &&
                !window.confirm(
                  "توجد بيانات لم تتم مزامنتها بعد (حضور أو وثائق). ستبقى محفوظة على هذا الجهاز وسيتم إرسالها تلقائيًا عند تسجيل الدخول مجددًا بنفس الحساب مع اتصال بالإنترنت.\n\nهل تريد تسجيل الخروج الآن رغم ذلك؟",
                )
              ) return;
              await logout();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200"
          >
            <LogOut size={24} className="text-red-600" />
            <span className="font-semibold">تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      <div
        role="button"
        tabIndex={0}
        aria-label={isOpen ? "إغلاق القائمة" : "فتح القائمة"}
        aria-expanded={isOpen}
        title={isOpen ? "إغلاق القائمة" : "فتح القائمة"}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsOpen((open) => !open);
          }
        }}
        className={`fixed top-0 h-20 w-[25px] z-[60] cursor-pointer bg-scout-purple shadow-lg transition-[right] duration-300 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 flex items-center justify-center ${
          isOpen ? "right-64" : "right-0"
        }`}
      >
        <ChevronLeft size={18} className={`text-white transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </div>

      {isOpen && <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setIsOpen(false)} />}
      <div className={`hidden lg:block transition-all duration-300 ${isOpen ? "w-64" : "w-0"}`} />
    </>
  );
}
