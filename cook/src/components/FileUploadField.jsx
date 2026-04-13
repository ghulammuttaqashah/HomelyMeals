const FileUploadField = ({ 
  label, 
  required = false, 
  accept = 'image/*', 
  multiple = false,
  onChange,
  preview,
  onRemove,
  fileName,
  helperText
}) => {
  return (
    <div>
      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {helperText && <div className="mb-2 text-xs">{helperText}</div>}
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={onChange}
        className="block w-full text-xs sm:text-sm text-gray-500 file:mr-2 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-3 sm:file:px-4 file:rounded-lg file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
      />
      
      {/* Single image preview */}
      {preview && !Array.isArray(preview) && (
        <img src={preview} alt={label} className="mt-2 sm:mt-3 h-24 sm:h-32 rounded-lg border" />
      )}
      
      {/* Multiple images preview */}
      {preview && Array.isArray(preview) && preview.length > 0 && (
        <div className="mt-2 sm:mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          {preview.map((img, index) => (
            <div key={index} className="relative">
              <img src={img} alt={`${label} ${index + 1}`} className="h-24 sm:h-32 w-full rounded-lg border object-cover" />
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 rounded-full bg-red-500 p-0.5 sm:p-1 text-white hover:bg-red-600"
                >
                  <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-gray-600">File selected: {fileName}</p>
      )}
    </div>
  )
}

export default FileUploadField
