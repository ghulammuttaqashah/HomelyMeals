const FileUploadField = ({ 
  label, 
  required = false, 
  accept = 'image/*', 
  multiple = false,
  onChange,
  preview,
  onRemove,
  fileName
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={onChange}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
      />
      
      {/* Single image preview */}
      {preview && !Array.isArray(preview) && (
        <img src={preview} alt={label} className="mt-3 h-32 rounded-lg border" />
      )}
      
      {/* Multiple images preview */}
      {preview && Array.isArray(preview) && preview.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-3">
          {preview.map((img, index) => (
            <div key={index} className="relative">
              <img src={img} alt={`${label} ${index + 1}`} className="h-32 w-full rounded-lg border object-cover" />
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* File name for non-image files */}
      {fileName && (
        <p className="mt-2 text-xs text-gray-600">File selected: {fileName}</p>
      )}
    </div>
  )
}

export default FileUploadField
