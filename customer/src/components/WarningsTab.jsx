import { FiShield, FiAlertTriangle, FiMail, FiCalendar, FiFileText } from "react-icons/fi";

const POLICY_ITEMS = [
  "Accumulating 3 warnings will result in automatic account suspension.",
  "Suspended accounts cannot place orders or access platform features.",
  "To appeal a suspension or request reinstatement, contact our admin at homelymeals4@gmail.com.",
  "False complaints or policy violations may result in a warning being issued.",
];

const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const WarningsTab = ({ warnings = [], userType = "customer" }) => {
  const total = warnings.length;
  const featureLabel = userType === "cook" ? "accept orders" : "place orders";

  // Progress bar: 0 → 3
  const progressPct = Math.min((total / 3) * 100, 100);
  const progressColor =
    total >= 3 ? "bg-red-500" : total === 2 ? "bg-orange-400" : total === 1 ? "bg-amber-400" : "bg-green-400";

  return (
    <div className="space-y-4">
      {/* ── Status card ── */}
      <div className={`rounded-xl border p-4 ${
        total >= 3
          ? "bg-red-50 border-red-200"
          : total > 0
            ? "bg-amber-50 border-amber-200"
            : "bg-green-50 border-green-200"
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FiShield className={`w-5 h-5 flex-shrink-0 ${total >= 3 ? "text-red-600" : total > 0 ? "text-amber-600" : "text-green-600"}`} />
            <p className={`text-sm font-bold ${total >= 3 ? "text-red-800" : total > 0 ? "text-amber-800" : "text-green-800"}`}>
              {total >= 3 ? "Account Suspended / At Risk" : total > 0 ? "Active Warnings" : "Account Standing: Good"}
            </p>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
            total >= 3
              ? "bg-red-100 text-red-700 border-red-200"
              : total > 0
                ? "bg-amber-100 text-amber-700 border-amber-200"
                : "bg-green-100 text-green-700 border-green-200"
          }`}>
            {total} / 3
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-white/60 rounded-full h-2 mb-3 overflow-hidden border border-white/40">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {total >= 3 ? (
          <p className={`text-xs text-red-700`}>
            Your account has been or will be automatically suspended. Contact{" "}
            <a href="mailto:homelymeals4@gmail.com" className="underline font-semibold">
              homelymeals4@gmail.com
            </a>{" "}
            to request reinstatement.
          </p>
        ) : total > 0 ? (
          <p className="text-xs text-amber-700">
            {3 - total} more warning{3 - total !== 1 ? "s" : ""} will result in automatic suspension.
          </p>
        ) : (
          <p className="text-xs text-green-700">No warnings on your account. Keep it up!</p>
        )}
      </div>

      {/* ── Warning cards ── */}
      {total > 0 && (
        <div className="space-y-3">
          {warnings.map((warning, idx) => (
            <div
              key={warning._id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            >
              {/* Header strip */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-red-50 border-b border-red-100">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[10px] font-bold">{idx + 1}</span>
                  </div>
                  <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Warning #{idx + 1}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <FiCalendar className="w-3 h-3" />
                  {formatDate(warning.createdAt)}
                </div>
              </div>

              {/* Body */}
              <div className="px-4 py-3 space-y-2">
                <p className="text-sm text-gray-800 leading-relaxed">{warning.message}</p>
                {warning.complaintId && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5">
                    <FiFileText className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Related complaint: <span className="font-medium text-gray-700">{warning.complaintId.type}</span></span>
                    <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      warning.complaintId.status === "resolved"
                        ? "bg-green-100 text-green-700"
                        : warning.complaintId.status === "rejected"
                          ? "bg-gray-100 text-gray-600"
                          : "bg-blue-100 text-blue-700"
                    }`}>
                      {warning.complaintId.status?.replace("_", " ")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Policy box ── */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <FiShield className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-amber-800">Warning Policy</p>
        </div>
        <ul className="space-y-2">
          {POLICY_ITEMS.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-amber-700">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
              {item.replace("place orders", featureLabel)}
            </li>
          ))}
        </ul>
        <a
          href="mailto:homelymeals4@gmail.com"
          className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors"
        >
          <FiMail className="w-3.5 h-3.5" />
          homelymeals4@gmail.com
        </a>
      </div>
    </div>
  );
};

export default WarningsTab;
