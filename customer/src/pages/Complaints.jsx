import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { getMyComplaints, getComplaintById, getMyWarnings, getComplaintsAgainstMe, submitComplaintReply } from "../api/complaints";
import { uploadToCloudinary } from "../utils/cloudinary";
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
  FiMessageSquare,
  FiUpload,
  FiSend,
} from "react-icons/fi";

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: FiClock },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-800", icon: FiAlertTriangle },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-800", icon: FiCheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800", icon: FiXCircle },
};

const Complaints = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("complaints");
  const [complaints, setComplaints] = useState([]);
  const [againstMeComplaints, setAgainstMeComplaints] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Reply form state
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyImages, setReplyImages] = useState([]);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [uploadingReply, setUploadingReply] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [complaintsRes, againstMeRes, warningsRes] = await Promise.all([
        getMyComplaints(),
        getComplaintsAgainstMe(),
        getMyWarnings(),
      ]);
      setComplaints(complaintsRes.complaints);
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

  const closeDetail = () => {
    setSelectedComplaint(null);
    setShowReplyForm(false);
    setReplyText("");
    setReplyImages([]);
  };

  const handleReplyImageAdd = (e) => {
    const files = Array.from(e.target.files);
    if (replyImages.length + files.length > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }
    const newImages = files
      .filter((f) => ["image/jpeg", "image/png", "image/jpg"].includes(f.type))
      .filter((f) => f.size <= 5 * 1024 * 1024)
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));

    if (newImages.length < files.length) {
      toast.error("Some files were skipped (only JPG/PNG under 5MB)");
    }
    setReplyImages((prev) => [...prev, ...newImages]);
    e.target.value = "";
  };

  const removeReplyImage = (index) => {
    setReplyImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim() || replyText.trim().length < 10) {
      toast.error("Please write at least 10 characters");
      return;
    }
    setSubmittingReply(true);
    try {
      let proofUrls = [];
      if (replyImages.length > 0) {
        setUploadingReply(true);
        proofUrls = await Promise.all(
          replyImages.map((img) => uploadToCloudinary(img.file, "complaints"))
        );
        setUploadingReply(false);
      }

      await submitComplaintReply(selectedComplaint._id, {
        text: replyText.trim(),
        proofUrls,
      });

      toast.success("Your reply has been submitted successfully.");
      setShowReplyForm(false);
      setReplyText("");
      setReplyImages([]);
      // Refresh detail
      await viewDetail(selectedComplaint._id);
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to submit reply";
      toast.error(msg);
    } finally {
      setSubmittingReply(false);
      setUploadingReply(false);
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

  const displayedComplaints = activeTab === "complaints" ? complaints : againstMeComplaints;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
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
            onClick={() => setActiveTab("complaints")}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "complaints"
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            My Complaints
            {complaints.filter(c => {
              if (["resolved", "rejected"].includes(c.status)) return false;
              if (!c.responses || c.responses.length === 0) return false;
              const lastResp = c.responses[c.responses.length - 1];
              const myId = c.complainantId._id || c.complainantId;
              return String(lastResp.senderId) !== String(myId);
            }).length > 0 && (
              <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                {complaints.filter(c => {
                  if (["resolved", "rejected"].includes(c.status)) return false;
                  if (!c.responses || c.responses.length === 0) return false;
                  const lastResp = c.responses[c.responses.length - 1];
                  const myId = c.complainantId._id || c.complainantId;
                  return String(lastResp.senderId) !== String(myId);
                }).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("against_me")}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "against_me"
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Filed Against Me
            {againstMeComplaints.filter(c => {
              if (["resolved", "rejected"].includes(c.status)) return false;
              if (!c.responses || c.responses.length === 0) return false;
              const lastResp = c.responses[c.responses.length - 1];
              const myId = c.againstUserId._id || c.againstUserId;
              return String(lastResp.senderId) !== String(myId);
            }).length > 0 && (
              <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                {againstMeComplaints.filter(c => {
                  if (["resolved", "rejected"].includes(c.status)) return false;
                  if (!c.responses || c.responses.length === 0) return false;
                  const lastResp = c.responses[c.responses.length - 1];
                  const myId = c.againstUserId._id || c.againstUserId;
                  return String(lastResp.senderId) !== String(myId);
                }).length}
              </span>
            )}
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
          /* ── Complaints Tabs (My Complaints / Against Me) ── */
          displayedComplaints.length === 0 ? (
            <div className="text-center py-12">
              <FiAlertTriangle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 mb-4">
                {activeTab === "complaints"
                  ? "No complaints filed yet"
                  : "No complaints filed against you"}
              </p>
              {activeTab === "complaints" && (
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
                const isClosed = ["resolved", "rejected"].includes(complaint.status);
                
                const lastResponse = complaint.responses && complaint.responses.length > 0 ? complaint.responses[complaint.responses.length - 1] : null;
                const myId = activeTab === "complaints" ? (complaint.complainantId?._id || complaint.complainantId) : (complaint.againstUserId?._id || complaint.againstUserId);
                const needsResponse = !isClosed && lastResponse && String(lastResponse.senderId) !== String(myId);

                return (
                  <div
                    key={complaint._id}
                    onClick={() => viewDetail(complaint._id)}
                    className={`bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow ${needsResponse ? 'border-l-4 border-orange-400' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-gray-800">{complaint.type}</span>
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusCfg.label}
                          </span>
                          {needsResponse && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                              <FiMessageSquare className="w-3 h-3" />
                              New Response
                            </span>
                          )}
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

      {/* Inline Detail Modal */}
      {selectedComplaint && (() => {
        const c = selectedComplaint;
        const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
        const StatusIcon = statusCfg.icon;
        const isAgainstMe = activeTab === "against_me";
        const canSubmitJustification = isAgainstMe && c.justification?.requested && !c.justification?.submitted && !["resolved", "rejected"].includes(c.status);

        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-xl z-10">
                <h2 className="text-lg font-bold text-gray-800">Complaint Details</h2>
                <button
                  onClick={closeDetail}
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
                  <p className="text-sm text-gray-500 mb-1">
                    {isAgainstMe ? "Complaint Against You" : "Your Description"}
                  </p>
                  <p className="text-gray-800 bg-gray-50 p-3 rounded-lg">{c.description}</p>
                </div>

                {c.proofUrls && c.proofUrls.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                      <FiImage className="w-4 h-4" /> {isAgainstMe ? "Complainant's Proof" : "Your Proof Images"}
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
                    <p className="text-sm text-gray-500 mb-1">Latest Admin Feedback</p>
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                      <p className="text-blue-800">{c.adminResponse}</p>
                    </div>
                  </div>
                )}

                {/* ── Response Thread ── */}
                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <FiMessageSquare className="w-5 h-5 text-orange-500" />
                    Response Thread
                  </h3>

                  {c.responses && c.responses.length > 0 ? (
                    <div className="space-y-4 mb-4">
                      {c.responses.map((res, index) => {
                        const isMe = res.senderId === c.complainantId ? !isAgainstMe : isAgainstMe;
                        return (
                          <div
                            key={index}
                            className={`p-4 rounded-xl border ${isMe ? 'bg-orange-50 border-orange-100 ml-8' : 'bg-gray-50 border-gray-200 mr-8'}`}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <div>
                                <span className="font-semibold text-gray-800">{isMe ? 'You' : res.senderName}</span>
                                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-white border text-gray-500 uppercase tracking-wide">
                                  {res.senderRole}
                                </span>
                              </div>
                              <span className="text-xs text-gray-400">{formatDate(res.createdAt)}</span>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{res.text}</p>
                            
                            {res.proofUrls && res.proofUrls.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200/50">
                                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                                  <FiImage className="w-3 h-3" /> Attached Proof
                                </p>
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                  {res.proofUrls.map((proof, i) => (
                                    <a key={i} href={proof.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                                      <img
                                        src={proof.url}
                                        alt={`Proof ${i + 1}`}
                                        className="h-20 w-32 object-cover rounded border hover:opacity-80 transition-opacity"
                                      />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg flex items-center gap-3 text-gray-500 mb-4">
                      <FiMessageSquare className="w-5 h-5 opacity-50" />
                      <p className="text-sm">No responses yet. Use the thread below to communicate regarding this complaint.</p>
                    </div>
                  )}

                  {/* Reply Form */}
                  {!['resolved', 'rejected'].includes(c.status) ? (
                    showReplyForm ? (
                      <div className="bg-white border border-orange-200 p-4 rounded-xl shadow-sm space-y-3 mt-4">
                        <p className="text-sm text-gray-800 font-medium">Write your reply</p>
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={4}
                          maxLength={1000}
                          placeholder="Type your message here..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 resize-none text-sm"
                        />
                        <div className="flex justify-between">
                          <p className="text-xs text-gray-400">Min 10 characters</p>
                          <p className={`text-xs ${replyText.length > 900 ? "text-orange-500 font-medium" : "text-gray-400"}`}>
                            {replyText.length}/1000
                          </p>
                        </div>

                        {/* Image upload */}
                        {replyImages.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {replyImages.map((img, i) => (
                              <div key={i} className="relative group rounded-lg overflow-hidden border border-gray-200">
                                <img src={img.preview} alt={`Proof ${i + 1}`} className="w-full h-20 object-cover" />
                                <button
                                  type="button"
                                  onClick={() => removeReplyImage(i)}
                                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <FiX className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {replyImages.length < 5 && (
                          <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-sm text-gray-600">
                            <FiUpload className="w-4 h-4" />
                            Attach Images ({replyImages.length}/5)
                            <input type="file" accept="image/jpeg,image/png,image/jpg" multiple onChange={handleReplyImageAdd} className="hidden" />
                          </label>
                        )}

                        <div className="flex gap-2 pt-2 border-t border-gray-100">
                          <button
                            onClick={handleSubmitReply}
                            disabled={submittingReply || uploadingReply || replyText.trim().length < 10}
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors text-sm font-medium flex items-center gap-1.5"
                          >
                            {(submittingReply || uploadingReply) ? (
                              <svg className="animate-spin -ml-1 h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : <FiSend className="w-3.5 h-3.5" />}
                            {uploadingReply ? "Uploading..." : submittingReply ? "Sending..." : "Send Reply"}
                          </button>
                          <button
                            onClick={() => { setShowReplyForm(false); setReplyText(""); setReplyImages([]); }}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowReplyForm(true)}
                        className="w-full py-3 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl hover:bg-orange-100 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <FiMessageSquare className="w-4 h-4" />
                        Reply to Thread
                      </button>
                    )
                  ) : (
                    <div className="bg-gray-100 border border-gray-200 p-3 rounded-lg text-center text-sm text-gray-500">
                      This complaint has been closed. No further replies can be added.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Complaints;
