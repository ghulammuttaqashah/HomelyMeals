import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  getDefaultProfileImage,
  updateDefaultProfileImage,
  deleteDefaultProfileImage,
} from "../api/settings";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Loader from "../components/Loader";
import BackButton from "../components/BackButton";
import { FiUpload, FiTrash2, FiImage, FiSave, FiX } from "react-icons/fi";

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [newImageFile, setNewImageFile] = useState(null);
  const [newImagePreview, setNewImagePreview] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  useEffect(() => {
    fetchCurrentImage();
  }, []);

  const fetchCurrentImage = async () => {
    try {
      setLoading(true);
      const data = await getDefaultProfileImage();
      setCurrentImageUrl(data.defaultImageUrl);
      setLastUpdated(data.updatedAt);
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error("Error fetching default image:", error);
        toast.error("Failed to load current default image");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      toast.error("Only JPG and PNG images are allowed");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setNewImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", "default-profile");

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error("Failed to upload to Cloudinary");
    }

    const data = await response.json();
    return data.secure_url;
  };

  const handleSave = async () => {
    if (!newImageFile) {
      toast.error("Please select an image first");
      return;
    }

    setSaving(true);
    setUploading(true);
    const loadingToast = toast.loading("Uploading image to Cloudinary...");

    try {
      // Upload to Cloudinary
      const imageUrl = await uploadToCloudinary(newImageFile);
      
      toast.loading("Saving to database...", { id: loadingToast });

      // Save URL to database
      const response = await updateDefaultProfileImage(imageUrl);
      
      setCurrentImageUrl(response.defaultImageUrl);
      setLastUpdated(response.updatedAt);
      setNewImageFile(null);
      setNewImagePreview(null);

      toast.success("Default profile image updated successfully!", { id: loadingToast });
    } catch (error) {
      console.error("Error saving image:", error);
      console.error("Error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        method: error.config?.method
      });
      toast.error(error.response?.data?.message || "Failed to save image", { id: loadingToast });
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentImageUrl) {
      toast.error("No default image to delete");
      return;
    }

    if (!window.confirm("Are you sure you want to delete the default profile image? Cooks using this image will see a broken link.")) {
      return;
    }

    setDeleting(true);
    const loadingToast = toast.loading("Deleting default image...");

    try {
      await deleteDefaultProfileImage();
      setCurrentImageUrl(null);
      setLastUpdated(null);
      toast.success("Default profile image deleted successfully!", { id: loadingToast });
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error(error.response?.data?.message || "Failed to delete image", { id: loadingToast });
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    setNewImageFile(null);
    setNewImagePreview(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-grow w-full px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
        <div className="max-w-4xl mx-auto">
          <BackButton />

          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 text-xs sm:text-sm mt-1">
              Manage system-wide settings and configurations
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-24">
              <Loader />
              <p className="text-gray-400 text-sm mt-3">Loading settings...</p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {/* Default Profile Image Section */}
              <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-4 sm:mb-5">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <FiImage className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">
                      Default Profile Image
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
                      This image will be used when cooks select "Use Default Image" during registration
                    </p>
                  </div>
                </div>

                {/* Current Image Display */}
                {currentImageUrl && !newImagePreview && (
                  <div className="mb-4 sm:mb-6">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Current Default Image
                    </label>
                    <div className="relative w-full">
                      <div className="w-full max-w-md mx-auto sm:mx-0">
                        <div className="w-full aspect-video bg-gray-100 rounded-lg border-2 border-gray-200 shadow-sm overflow-hidden flex items-center justify-center">
                          <img
                            src={currentImageUrl}
                            alt="Current Default Profile"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.src = "https://via.placeholder.com/400x300?text=Image+Not+Found";
                            }}
                          />
                        </div>
                      </div>
                      {lastUpdated && (
                        <p className="text-xs text-gray-500 mt-2 text-center sm:text-left">
                          Last updated: {new Date(lastUpdated).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* New Image Preview */}
                {newImagePreview && (
                  <div className="mb-4 sm:mb-6">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      New Image Preview
                    </label>
                    <div className="relative w-full">
                      <div className="w-full max-w-md mx-auto sm:mx-0">
                        <div className="w-full aspect-video bg-gray-100 rounded-lg border-2 border-orange-500 shadow-sm overflow-hidden flex items-center justify-center relative">
                          <img
                            src={newImagePreview}
                            alt="New Default Profile Preview"
                            className="w-full h-full object-contain"
                          />
                          <button
                            onClick={handleCancel}
                            className="absolute top-2 right-2 w-8 h-8 sm:w-9 sm:h-9 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg active:scale-95 z-10"
                            disabled={saving}
                            aria-label="Cancel"
                          >
                            <FiX className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload Section */}
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label
                      htmlFor="default-image-upload"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 active:bg-orange-800 transition-colors cursor-pointer text-sm sm:text-base shadow-sm active:scale-95 w-full sm:w-auto"
                    >
                      <FiUpload className="w-4 h-4" />
                      <span>{currentImageUrl ? "Change Image" : "Upload Image"}</span>
                    </label>
                    <input
                      id="default-image-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={saving || deleting}
                    />
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                      Recommended: 400x300px or similar aspect ratio. Max 5MB. JPG or PNG only.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  {newImageFile && (
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <button
                        onClick={handleSave}
                        disabled={saving || uploading}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base shadow-sm active:scale-95 flex-1 sm:flex-initial"
                      >
                        {saving ? (
                          <>
                            <Loader size="sm" className="text-white" />
                            <span>{uploading ? "Uploading..." : "Saving..."}</span>
                          </>
                        ) : (
                          <>
                            <FiSave className="w-4 h-4" />
                            <span>Save New Image</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={saving}
                        className="px-4 py-2.5 sm:py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 active:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base active:scale-95 flex-1 sm:flex-initial"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {currentImageUrl && !newImageFile && (
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base shadow-sm active:scale-95 w-full sm:w-auto"
                    >
                      {deleting ? (
                        <>
                          <Loader size="sm" className="text-white" />
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <>
                          <FiTrash2 className="w-4 h-4" />
                          <span>Delete Default Image</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Info Box */}
                <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-xs sm:text-sm font-semibold text-blue-900 mb-2 flex items-center gap-1.5">
                    <span>ℹ️</span>
                    <span>How it works</span>
                  </h3>
                  <ul className="text-xs sm:text-sm text-blue-800 space-y-1.5 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>Cooks can choose to use this default image during registration</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>The image is stored on Cloudinary and the URL is saved in the database</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>Changing this image will affect all new cooks who select the default option</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>Existing cooks using the old default URL will not be affected</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Settings;
