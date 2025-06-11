import { StorageModel } from '../models/storageModel.js';
import { StorageView } from '../views/storageView.js';
import { AuthView } from '../views/authView.js';

export const StorageController = {
  init() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput) return;
    
    const preview = document.getElementById('preview');
    const uploadBtn = document.getElementById('uploadBtn');
    const messageEl = document.getElementById('message');
    
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      StorageView.showImagePreview(preview, file);
      if (file && uploadBtn) uploadBtn.disabled = false;
    });
    
    if (uploadBtn) {
      uploadBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];
        if (!file) return;
        
        try {
          await StorageModel.uploadFile(
            'images',
            `uploads/${Date.now()}_${file.name}`,
            file
          );
          
          AuthView.showMessage(messageEl, 'Image uploaded successfully!', 'success');
          StorageView.resetUploadForm(fileInput, preview, uploadBtn);
        } catch (error) {
          AuthView.showMessage(messageEl, error.message);
        }
      });
    }
  }
};