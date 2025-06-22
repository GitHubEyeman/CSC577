import { StorageModel } from '../models/storageModel.js';
import { StorageView } from '../views/storageView.js';
import { AuthView } from '../views/authView.js';
import { AuthModel } from '../models/authModel.js';
import { supabaseClient } from '../services/supabaseService.js';

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
        uploadBtn.style.display = 'inline-block';
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
          uploadBtn.textContent = 'Analyzing...';
          
          const userFolder = `user_${user.id}`;
          const filePath = `${userFolder}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
          
          // Upload to Supabase
          await StorageModel.uploadFile('images', filePath, file);
          
          // Start analysis
          const response = await fetch('http://localhost:5000/analyze', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                  image_url: filePath,
                  user_id: user.id
              })
          });
          

          
          if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Analysis failed');
          }
          
          const analysisData = await response.json();
          
          // Store for results page
          // After getting analysisData from the server:
          // In the upload success handler:
          sessionStorage.setItem('currentAnalysis', JSON.stringify({
              id: analysisData.analysis_id,
              imageUrl: filePath,
              color_palette: analysisData.results?.color_palette || [],
              overall_rating: analysisData.results?.overall_rating || 'No rating available',
              color_critique: analysisData.results?.color_critique || 'No color critique available',
              other_feedback: analysisData.results?.other_feedback || 'No additional feedback available'
          }));

          // In the uploadBtn click handler, after getting analysisData:
          const analysisPayload = {
              id: analysisData.analysis_id,
              imageUrl: filePath,
              color_palette: analysisData.color_palette || [],
              overall_rating: analysisData.overall_rating || 'No rating available',
              color_critique: analysisData.color_critique || 'No color critique available',
              other_feedback: analysisData.other_feedback || 'No additional feedback available'
          };

          // Store for both immediate use and database consistency
          sessionStorage.setItem('currentAnalysis', JSON.stringify(analysisPayload));

          // Also update Supabase to match the structure
          await supabaseClient
              .from('analyses')
              .update({
                  results: {
                      color_palette: analysisPayload.color_palette,
                      overall_rating: analysisPayload.overall_rating,
                      color_critique: analysisPayload.color_critique,
                      other_feedback: analysisPayload.other_feedback
                  }
              })
              .eq('analysis_id', analysisData.analysis_id);

          window.location.href = `results.html?analysis_id=${analysisData.analysis_id}`;


          // In displayAnalysisResults()
          if (!analysisData.color_palette || !analysisData.overall_rating) {
              console.warn("Analysis data is missing required fields:", analysisData);
              const warning = document.createElement('div');
              warning.className = 'data-warning';
              warning.textContent = 'Some analysis data appears to be incomplete';
              document.querySelector('.critique-section').prepend(warning);
          }

          
          

          
      } catch (error) {
          AuthView.showMessage(messageEl, error.message);
      } finally {
          uploadBtn.disabled = false;
          uploadBtn.textContent = 'Upload Image';
      }
  });
    
    await this.listUserFiles();
  }
};