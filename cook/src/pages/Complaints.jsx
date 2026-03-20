import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { getMyComplaints, getComplaintById, getComplaintsAgainstMe, getMyWarnings } from "../api/complaints";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Loader from "../components/Loader";
import {
  FiArrowLeft,
  FiPlus,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
  FiChevronRight,
  FiX,
  FiImage,
  FiShield,
} from "react-icons/fi";

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: FiClock },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-800", icon: FiAlertTriangle },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-800", icon: FiCheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800", icon: FiXCircle },
};

const Complaints = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("my_complaints");
  const [myComplaints, setMyComplaints] = useState([]);
  const [againstMeComplaints, setAgainstMeComplaints] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [myRes, againstMeRes, warningsRes] = await Promise.all([
        getMyComplaints(),
        getComplaintsAgainstMe(),
        getMyWarnings(),
      ]);
      setMyComplaints(myRes.complaints);
      setAgainstMeComplaints(againstMeRes.complaints);
      setWarnings(warningsRes.warnings);
    } catch (error) {
      console.error("Fetch data error:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const viewDetail = async (id) => {
    setDetailLoading(true);
    try {
      const result = await getComplaintById(id);
      setSelectedComplaint(result.complaint);
    } catch (error) {
      toast.error("Failed to load complaint details");
    } finally {
      setDetailLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-PK", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const displayedComplaints = activeTab === "my_complaints" ? myComplaints : againstMeComplaints;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header showSignOut={true} />
      <main className="flex-grow container mx-auto px-4 py-6 max-w-4xl">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-orange-600 mb-4 transition-colors"
        >
          <FiArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Complaints & Warnings</h1>
          <button
            onClick={() => navigate("/file-complaint")}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
          >
            <FiPlus className="w-4 h-4" />
            File Complaint
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("my_complaints")}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === "my_complaints"
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Filed by Me
          </button>
          <button
            onClick={() => setActiveTab("against_me")}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === "against_me"
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Filed Against Me
          </button>
          <button
            onClick={() => setActiveTab("warnings")}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "warnings"
                ? "border-red-600 text-red-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <FiShield className="w-4 h-4" />
            Warnings
            {warnings.length > 0 && (
              <span className="bg-red-100 text-red-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {warnings.length}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader />
          </div>
        ) : activeTab === "warnings" ? (
          /* ── Warnings Tab ── */
          warnings.length === 0 ? (
            <div className="text-center py-12">
              <FiShield className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No warnings on your account</p>
              <p className="text-sm text-gray-400 mt-1">Keep up the good work!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {warnings.length >= 3 && (
                <div className="bg-red-50 border border-red-300 rounded-lg p-4 flex items-start gap-3">
                  <FiAlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-800">Account at risk</p>
                    <p className="text-sm text-red-600">
                      You have {warnings.length} warning(s). Accounts with 3+ warnings may be suspended.
                    </p>
                  </div>
                </div>
              )}
              {warnings.map((warning) => (
                <div
                  key={warning._id}
                  className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-400"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FiAlertTriangle className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-800 font-medium">{warning.message}</p>
                      {warning.complaintId && (
                        <p className="text-sm text-gray-500 mt-1">
                          Related to: {warning.complaintId.type}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">{formatDate(warning.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* ── Complaints Tabs (Filed by Me / Against Me) ── */
          displayedComplaints.length === 0 ? (
            <div className="text-center py-12">
              <FiAlertTriangle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 mb-4">
                {activeTab === "my_complaints"
                  ? "No complaints filed yet"
                  : "No complaints filed against you"}
              </p>
              {activeTab === "my_complaints" && (
                <button
                  onClick={() => navigate("/file-complaint")}
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  File your first complaint
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {displayedComplaints.map((complaint) => {
                const statusCfg = STATUS_CONFIG[complaint.status] || STATUS_CONFIG.pending;
                const StatusIcon = statusCfg.icon;

                return (
                  <div
                    key={complaint._id}
                    onClick={() => viewDetail(complaint._id)}
                    className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-800">{complaint.type}</span>
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusCfg.label}
                          </span>
                        </div>
                        {complaint.orderId && (
                          <p className="text-sm text-gray-500">
                            Order #{complaint.orderId.orderNumber}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(complaint.createdAt)}
                        </p>
                      </div>
                      <FiChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </main>
      <Footer />

      {/* Loading overlay for detail */}
      {detailLoading && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <Loader />
        </div>
      )}

      {/* Inline Detail Modal (not a nested component to avoid re-mount on state change) */}
      {selectedComplaint && (() => {
        const c = selectedComplaint;
        const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
        const StatusIcon = statusCfg.icon;

        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-xl">
                <h2 className="text-lg font-bold text-gray-800">Complaint Details</h2>
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusCfg.color}`}>
                    <StatusIcon className="w-4 h-4" />
                    {statusCfg.label}
                  </span>
                </div>

                {c.orderId && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Order</p>
                    <p className="font-semibold">#{c.orderId.orderNumber}</p>
                    <p className="text-sm text-gray-600">Rs. {c.orderId.totalAmount}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-gray-500">Type</p>
                    <p className="font-medium">{c.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Filed on</p>
                    <p className="font-medium">{formatDate(c.createdAt)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Description</p>
                  <p className="text-gray-800 bg-gray-50 p-3 rounded-lg">{c.description}</p>
                </div>

                {c.proofUrls && c.proofUrls.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                      <FiImage className="w-4 h-4" /> Proof Images
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {c.proofUrls.map((proof, i) => (
                        <a key={i} href={proof.url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={proof.url}
                            alt={`Proof ${i + 1}`}
                            className="w-full h-24 object-cover rounded-lg border hover:opacity-80 transition-opacity"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {c.adminResponse && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-500 mb-1">Admin Response</p>
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                      <p className="text-blue-800">{c.adminResponse}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Complaints;
