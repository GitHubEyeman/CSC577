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
  },


  displayUserFiles(container, files) {
    if (!container) return;
    
    container.innerHTML = ''; // Clear previous content
    
    if (!files || files.length === 0) {
      container.innerHTML = '<p>No files uploaded yet.</p>';
      return;
    }
    
    const list = document.createElement('ul');
    files.forEach(file => {
      const item = document.createElement('li');
      item.textContent = file.name;
      list.appendChild(item);
    });
    
    container.appendChild(list);
  }

};