import { StorageModel } from '../models/storageModel.js';
import { StorageView } from '../views/storageView.js';
import { AuthView } from '../views/authView.js';
import { AuthModel } from '../models/authModel.js';

export const StorageController = {
  async listUserFiles() {
    try {
      const user = await AuthModel.checkAuth(false);
      if (!user) return;
      
      const filesContainer = document.getElementById('userFilesContainer');
      if (!filesContainer) return;
      
      const files = await StorageModel.getUserFiles('images', user.id);
      StorageView.displayUserFiles(filesContainer, files);
    } catch (error) {
      console.error('Error listing files:', error);
    }
  },

  async init() {
    // First get all elements
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const imagePreview = document.getElementById('imagePreview');
    const messageEl = document.getElementById('message');
    
    // Then check if they exist
    if (!fileInput || !uploadBtn || !imagePreview) return;
    
    // Get current user
    const user = await AuthModel.checkAuth(false);
    
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      
      if (file) {
        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          AuthView.showMessage(messageEl, 'File size exceeds 5MB limit', 'error');
          return;
        }
        
        // Validate file type
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
          AuthView.showMessage(messageEl, 'Only PNG and JPEG files are allowed', 'error');
          return;
        }
        
        // Create preview
        const reader = new FileReader();
        reader.onload = (event) => {
          imagePreview.src = event.target.result;
          imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
        
        // Show and enable upload button
        uploadBtn.style.display = 'inline-block'; // Changed from 'block' to 'inline-block'
        uploadBtn.disabled = false;
      } else {
        // No file selected
        imagePreview.style.display = 'none';
        uploadBtn.style.display = 'none';
      }
    });
    
    uploadBtn.addEventListener('click', async () => {
      const file = fileInput.files[0];
      if (!file || !user) return;
      
      try {
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';
        
        const userFolder = `user_${user.id}`;
        const filePath = `${userFolder}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        
        await StorageModel.uploadFile('images', filePath, file);
        
        AuthView.showMessage(messageEl, 'Image uploaded successfully!', 'success');
        
        // Reset form
        fileInput.value = '';
        imagePreview.style.display = 'none';
        uploadBtn.style.display = 'none';
        uploadBtn.textContent = 'Upload Image';
        
        // Refresh file list
        await this.listUserFiles();
      } catch (error) {
        AuthView.showMessage(messageEl, error.message);
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload Image';
      }
    });
    
    await this.listUserFiles();
  }
};