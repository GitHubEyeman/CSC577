export const StorageView = {
  showImagePreview(element, file) {
    if (file && element) {
      element.src = URL.createObjectURL(file);
      element.style.display = 'block';
    }
  },

  resetUploadForm(inputElement, previewElement, buttonElement) {
    if (inputElement) inputElement.value = '';
    if (previewElement) previewElement.style.display = 'none';
    if (buttonElement) buttonElement.disabled = true;
  }
};