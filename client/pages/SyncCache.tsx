import { useEffect, useState, useCallback } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { listQrRecords } from "@/lib/offline/qrOfflineStore";
import { listSyncQueue } from "@/lib/offline/syncQueue";
import { useNetworkStatus } from "@/lib/offline/network";
import { runSync } from "@/lib/offline/syncEngine";
import { useAuth } from "@/context/AuthContext";
import type { OfflineQrRecord, SyncQueueItem } from "@/lib/offline/types";
import { RefreshCw, UploadCloud, CheckCircle2, AlertCircle, Clock } from "lucide-react";

/**
 * "Espace de stockage" -- lets a member see what's saved locally on their
 * device (attendance scans + membership document uploads) while offline,
 * and what's still waiting to reach the server. Reads the SAME local
 * database the rest of the offline system already writes to
 * (client/lib/offline/*) rather than a separate parallel store.
 */
export default function SyncCache() {
  const [qrRecords, setQrRecords] = useState<OfflineQrRecord[]>([]);
  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { isOnline } = useNetworkStatus();
  const { user } = useAuth();

  const loadCache = useCallback(async () => {
    setLoading(true);
    try {
      const [records, queue] = await Promise.all([listQrRecords(), listSyncQueue()]);
      setQrRecords(records);
      setQueueItems(queue);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCache();
  }, [loadCache]);

  const handlePushAll = async () => {
    setSyncing(true);
    try {
      await runSync();
    } finally {
      setSyncing(false);
      await loadCache();
    }
  };

  const pendingCount = queueItems.filter((item) => item.status !== "synced").length;

  return (
    <Layout currentPage="sync-cache">
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-3 text-4xl font-black shm-text-gradient uppercase tracking-wider">
            مساحة تخزين البيانات
          </h1>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${
                isOnline ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-amber-500"}`} />
              {isOnline ? "متصل" : "غير متصل"}
            </span>
            {pendingCount > 0 && (
              <span className="text-xs font-black text-gray-400">{pendingCount} عنصر بانتظار المزامنة</span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={loadCache} variant="outline" className="gap-2 rounded-xl font-black" disabled={loading}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            تحديث
          </Button>
          <Button
            onClick={handlePushAll}
            className="gap-2 rounded-xl font-black"
            disabled={syncing || !isOnline || pendingCount === 0}
          >
            <UploadCloud size={16} className={syncing ? "animate-pulse" : ""} />
            {syncing ? "جاري الإرسال..." : "دفع الكل الآن"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="h-14 w-14 animate-spin rounded-full border-b-4 border-primary" />
        </div>
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="mb-4 text-lg font-black text-gray-700">الحضور الممسوح ({qrRecords.length})</h2>
            {qrRecords.length === 0 ? (
              <EmptyState label="لا توجد عمليات مسح مخزنة محليا" />
            ) : (
              <div className="space-y-3">
                {qrRecords.map((r) => (
                  <CacheRow
                    key={r.id}
                    title={r.session_title || "حصة كشفية"}
                    createdAt={r.scanned_at}
                    status={r.synced ? "synced" : r.sync_error ? "failed" : "pending"}
                    errorMessage={r.sync_error || undefined}
                    memberQrCodeUrl={user?.qr_code_url}
                    membershipStatus={getMembershipStatus(user?.payment_completed, user?.documents_completed)}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-4 text-lg font-black text-gray-700">بانتظار الإرسال ({queueItems.length})</h2>
            {queueItems.length === 0 ? (
              <EmptyState label="لا شيء بانتظار الإرسال" />
            ) : (
              <div className="space-y-3">
                {queueItems.map((item) => (
                  <CacheRow
                    key={item.id}
                    title={item.type === "attendance_confirm" ? "تأكيد حضور" : "وثيقة عضوية"}
                    createdAt={item.created_at}
                    status={item.status === "synced" ? "synced" : item.status === "failed" ? "failed" : "pending"}
                    errorMessage={item.last_error || undefined}
                    memberQrCodeUrl={user?.qr_code_url}
                    membershipStatus={getMembershipStatus(user?.payment_completed, user?.documents_completed)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </Layout>
  );
}

function getMembershipStatus(paymentCompleted?: boolean, documentsCompleted?: boolean) {
  if (paymentCompleted && documentsCompleted) return "العضوية مكتملة";
  if (paymentCompleted) return "الواجب مؤدى - الوثائق غير مكتملة";
  if (documentsCompleted) return "الوثائق مكتملة - الواجب غير مؤدى";
  return "العضوية غير مكتملة";
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-[2rem] border-2 border-dashed border-gray-100 bg-white py-16 text-center">
      <p className="font-black uppercase tracking-[0.15em] text-gray-300">{label}</p>
    </div>
  );
}

function CacheRow({
  title,
  createdAt,
  status,
  errorMessage,
  memberQrCodeUrl,
  membershipStatus,
}: {
  title: string;
  createdAt: string;
  status: "pending" | "synced" | "failed";
  errorMessage?: string;
  memberQrCodeUrl?: string | null;
  membershipStatus: string;
}) {
  const badge =
    status === "synced" ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600">
        <CheckCircle2 size={14} /> تمت المزامنة
      </span>
    ) : status === "failed" ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600">
        <AlertCircle size={14} /> فشلت المزامنة
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-600">
        <Clock size={14} /> بانتظار الإرسال
      </span>
    );

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="min-w-0 flex-1 text-right">
        <p className="truncate font-black text-gray-800">{title || "بدون عنوان"}</p>
        <p className="text-xs font-bold text-gray-400">{new Date(createdAt).toLocaleString("ar-MA")}</p>
        <div className="mt-3 flex items-center gap-3">
          {memberQrCodeUrl ? (
            <img src={memberQrCodeUrl} alt="QR العضو" className="h-14 w-14 rounded border border-gray-200 object-contain" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded border border-dashed border-gray-300 text-center text-[9px] font-bold text-gray-400">QR<br />غير مولد</div>
          )}
          <div>
            <p className="text-xs font-black text-scout-purple">حالة العضوية</p>
            <p className="text-xs font-bold text-gray-600">{membershipStatus}</p>
          </div>
        </div>
        {status === "failed" && errorMessage && (
          <p className="mt-1 break-all text-[10px] font-mono text-red-400">{errorMessage}</p>
        )}
      </div>
      {badge}
    </div>
  );
}
