// src/components/cook/DocumentUploadPage.jsx
// Updated: Improved header UI, added back to home navigation, fixed verification status handling with correct messages and flow
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { X, Upload } from "lucide-react";
import {
  normalizeVerificationStatus,
  useAuth,
} from "../../contexts/AuthContext";

const DOCUMENT_SUBMIT_URL = "http://localhost:5000/api/cook/documents/submit";
const DASHBOARD_ROUTE = "/cook/dashboard";

const formatStatusLabel = (status) =>
  status
    ? status
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "";

const STATUS_STYLES = {
  pending: "bg-orange-100 text-orange-700",
  rejected: "bg-red-100 text-red-700",
};

const StatusPill = ({ status }) => {
  if (!status || !STATUS_STYLES[status]) return null;
  const label = status === "pending" ? "Pending" : "Rejected";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_STYLES[status]}`}
    >
      Status: {label}
    </span>
  );
};

const CLOUD_NAME = "dygeug69l";
const UPLOAD_PRESET = "cook_documents";

export default function DocumentUploadPage() {
  const navigate = useNavigate();
  const { user, updateVerificationStatus, logout } = useAuth();
  
  const [verificationStatus, setVerificationStatus] = useState("not_submitted");
  
  const [files, setFiles] = useState({
    cnicFront: null,
    cnicBack: null,
    kitchenPhotos: [],
    sfaLicense: null,
    certificate: null,
  });

  const [previews, setPreviews] = useState({
    cnicFront: null,
    cnicBack: null,
    kitchenPhotos: [],
    sfaLicense: null,
    certificate: null,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    // Keep verification view synced with the authenticated profile.
    const statusSource =
      user.verificationStatus ?? user.verificationStatusNormalized;
    setVerificationStatus(normalizeVerificationStatus(statusSource));
  }, [user]);

  // Redirect verified cooks straight to dashboard
  useEffect(() => {
    if (verificationStatus === "approved" || verificationStatus === "verified") {
      navigate(DASHBOARD_ROUTE, { replace: true });
    }
  }, [navigate, verificationStatus]);

  const handleFileChange = (e, key) => {
    const file = e.target.files[0];
    if (!file) return;

    if (key === "kitchenPhotos") {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => ({
        ...prev,
        kitchenPhotos: [...prev.kitchenPhotos, ...newFiles],
      }));
      
      // Create previews
      const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
      setPreviews((prev) => ({
        ...prev,
        kitchenPhotos: [...prev.kitchenPhotos, ...newPreviews],
      }));
    } else {
      setFiles((prev) => ({ ...prev, [key]: file }));
      
      // Create preview
      const preview = URL.createObjectURL(file);
      setPreviews((prev) => ({ ...prev, [key]: preview }));
    }
  };

  const removeFile = (key, index = null) => {
    if (key === "kitchenPhotos" && index !== null) {
      setFiles((prev) => ({
        ...prev,
        kitchenPhotos: prev.kitchenPhotos.filter((_, i) => i !== index),
      }));
      setPreviews((prev) => ({
        ...prev,
        kitchenPhotos: prev.kitchenPhotos.filter((_, i) => i !== index),
      }));
    } else {
      setFiles((prev) => ({ ...prev, [key]: null }));
      setPreviews((prev) => ({ ...prev, [key]: null }));
    }
  };

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();
    if (!res.ok || !data.secure_url) {
      throw new Error(
        data?.error?.message || "Failed to upload file. Please try again."
      );
    }

    return data.secure_url;
  };

  const submitDocumentsToBackend = async (urls) => {
    const payload = {
      cnicFront: urls.cnicFront,
      cnicBack: urls.cnicBack,
      kitchenPhotos: urls.kitchenPhotos || [],
    };

    if (urls.sfaLicense) {
      payload.sfaLicense = urls.sfaLicense;
    }

    if (urls.certificate) {
      payload.other = urls.certificate;
    }

    const response = await fetch(DOCUMENT_SUBMIT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || "Unable to submit documents.");
    }

    return data;
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!files.cnicFront) {
      newErrors.cnicFront = "This document is required.";
    }
    
    if (!files.cnicBack) {
      newErrors.cnicBack = "This document is required.";
    }
    
    if (!files.kitchenPhotos || files.kitchenPhotos.length === 0) {
      newErrors.kitchenPhotos = "This document is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpload = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      let urls = {};

      // Upload CNIC Front
      if (files.cnicFront) {
        urls.cnicFront = await uploadToCloudinary(files.cnicFront);
      }

      // Upload CNIC Back
      if (files.cnicBack) {
        urls.cnicBack = await uploadToCloudinary(files.cnicBack);
      }

      // Upload Kitchen Photos
      if (files.kitchenPhotos && files.kitchenPhotos.length > 0) {
        urls.kitchenPhotos = await Promise.all(
          files.kitchenPhotos.map((file) => uploadToCloudinary(file))
        );
      }

      // Upload SFA License (optional)
      if (files.sfaLicense) {
        urls.sfaLicense = await uploadToCloudinary(files.sfaLicense);
      }

      // Upload Certificate (optional)
      if (files.certificate) {
        urls.certificate = await uploadToCloudinary(files.certificate);
      }

      const submissionResponse = await submitDocumentsToBackend(urls);
      const nextStatus = normalizeVerificationStatus(
        submissionResponse?.cookVerificationStatus || "pending"
      );
      setVerificationStatus(nextStatus);
      updateVerificationStatus(nextStatus);
      setSuccessMessage(
        `Documents submitted successfully. Status: ${
          formatStatusLabel(nextStatus) || "Pending"
        }.`
      );
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || "Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/", { replace: true });
    }
  };

  // Render based on verification status
  if (verificationStatus === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 via-white to-orange-50">
        <div className="w-full max-w-2xl">
          <div className="mb-8">
            <div className="flex items-start justify-between">
              <div className="text-center flex-1">
                <h1 className="text-orange-600 mb-2 text-4xl font-bold">Homely Meals</h1>
                <p className="text-gray-600 text-lg">Document Verification</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="ml-4"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </div>
          </div>
          
          <Card>
            <CardHeader className="space-y-3">
              <CardTitle className="text-center text-green-600">Documents Submitted</CardTitle>
              <div className="flex justify-center">
                <StatusPill status="pending" />
              </div>
              <CardDescription className="text-center">
                Your documents are under review. Please check back later.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (verificationStatus === "approved" || verificationStatus === "verified") {
    return null;
  }

  // For rejected status, show message but continue to upload form below
  const showRejectionMessage = verificationStatus === "rejected";

  // Default: not_submitted or rejected - show upload form
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 via-white to-orange-50">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div className="text-center flex-1">
              <h1 className="text-orange-600 mb-2 text-4xl font-bold">Homely Meals</h1>
              <p className="text-gray-600 text-lg">Document Verification</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="ml-4"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="space-y-3">
            <CardTitle>Cook Document Upload</CardTitle>
            {showRejectionMessage && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <StatusPill status="rejected" />
              </div>
            )}
            <CardDescription>
              {showRejectionMessage
                ? "Your documents were rejected. Please re-upload correct documents."
                : verificationStatus === "not_submitted" || !verificationStatus
                ? "You have not submitted your documents yet. Please upload the required documents for verification."
                : "Please upload the required documents for verification."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {successMessage && (
              <div className="p-3 bg-green-100 text-green-700 rounded-md text-sm">
                {successMessage}
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
                {errorMessage}
              </div>
            )}

            {/* CNIC Front */}
            <div className="space-y-2">
              <Label>
                CNIC Front <span className="text-red-600">*</span>
              </Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, "cnicFront")}
              />
              {errors.cnicFront && (
                <p className="text-sm text-red-600">{errors.cnicFront}</p>
              )}
              {previews.cnicFront && (
                <div className="relative inline-block mt-2">
                  <img
                    src={previews.cnicFront}
                    alt="CNIC Front preview"
                    className="h-32 w-auto rounded border"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile("cnicFront")}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <p className="text-xs text-gray-600 mt-1">{files.cnicFront?.name}</p>
                </div>
              )}
            </div>

            {/* CNIC Back */}
            <div className="space-y-2">
              <Label>
                CNIC Back <span className="text-red-600">*</span>
              </Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, "cnicBack")}
              />
              {errors.cnicBack && (
                <p className="text-sm text-red-600">{errors.cnicBack}</p>
              )}
              {previews.cnicBack && (
                <div className="relative inline-block mt-2">
                  <img
                    src={previews.cnicBack}
                    alt="CNIC Back preview"
                    className="h-32 w-auto rounded border"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile("cnicBack")}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <p className="text-xs text-gray-600 mt-1">{files.cnicBack?.name}</p>
                </div>
              )}
            </div>

            {/* Kitchen Photo(s) */}
            <div className="space-y-2">
              <Label>
                Kitchen Photo(s) <span className="text-red-600">*</span>
              </Label>
              <p className="text-xs text-gray-500">You can upload multiple images</p>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFileChange(e, "kitchenPhotos")}
              />
              {errors.kitchenPhotos && (
                <p className="text-sm text-red-600">{errors.kitchenPhotos}</p>
              )}
              {previews.kitchenPhotos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {previews.kitchenPhotos.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Kitchen photo ${index + 1}`}
                        className="h-32 w-auto rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile("kitchenPhotos", index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <p className="text-xs text-gray-600 mt-1">
                        {files.kitchenPhotos[index]?.name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SFA License (optional) */}
            <div className="space-y-2">
              <Label>
                License <span className="text-gray-500 text-sm">(optional)</span>
              </Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => handleFileChange(e, "sfaLicense")}
              />
              {previews.sfaLicense && (
                <div className="relative inline-block mt-2">
                  <img
                    src={previews.sfaLicense}
                    alt="License preview"
                    className="h-32 w-auto rounded border"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile("sfaLicense")}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <p className="text-xs text-gray-600 mt-1">{files.sfaLicense?.name}</p>
                </div>
              )}
            </div>

            {/* Certificate (optional) */}
            <div className="space-y-2">
              <Label>
                Certificate <span className="text-gray-500 text-sm">(optional)</span>
              </Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => handleFileChange(e, "certificate")}
              />
              {previews.certificate && (
                <div className="relative inline-block mt-2">
                  <img
                    src={previews.certificate}
                    alt="Certificate preview"
                    className="h-32 w-auto rounded border"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile("certificate")}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <p className="text-xs text-gray-600 mt-1">{files.certificate?.name}</p>
                </div>
              )}
            </div>

            <Button
              className="w-full bg-orange-600 hover:bg-orange-700"
              onClick={handleUpload}
              disabled={loading}
            >
              {loading ? (
                "Uploading..."
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Submit Documents
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
