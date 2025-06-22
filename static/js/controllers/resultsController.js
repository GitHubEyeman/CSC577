import { AuthModel } from '../models/authModel.js';
import { AuthView } from '../views/authView.js';
import { supabaseClient } from '../services/supabaseService.js';

export const ResultsController = {
  async init() {
    try {
      // Check authentication
      const user = await AuthModel.checkAuth();
      if (!user) return;
      
      // Get analysis data
      const analysisData = JSON.parse(sessionStorage.getItem('currentAnalysis'));
      if (!analysisData) {
        window.location.href = 'insight.html';
        return;
      }
      
      // Get DOM elements
      const loadingIndicator = document.getElementById('loadingIndicator');
      const critiqueText = document.getElementById('critiqueText');
      const originalImage = document.getElementById('originalImagePreview');
      const downloadBtn = document.getElementById('downloadPdf');
      
      // Show loading state
      loadingIndicator.style.display = 'block';
      critiqueText.textContent = '';
      
      // Display critique
      critiqueText.textContent = analysisData.critique;
      
      // Show original image
      const { data: { publicUrl } } = supabaseClient
        .storage
        .from('images')
        .getPublicUrl(analysisData.imageUrl);
      originalImage.src = publicUrl;
      
      // Set up PDF download
      downloadBtn.addEventListener('click', () => this.downloadAsPdf({
        id: analysisData.id || 'temp-id',
        critique: analysisData.critique || "No critique available"
      }));
      
      // Hide loading indicator
      loadingIndicator.style.display = 'none';
      
    } catch (error) {
      console.error('Results initialization error:', error);
      const errorContainer = document.getElementById('critiqueText') || document.body;
      errorContainer.textContent = `Error loading results: ${error.message}`;
    }
  },
  
  async downloadAsPdf(analysis) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.text('UI Design Analysis Report', 105, 20, { align: 'center' });
      
      // Add date
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' });
      
      // Add critique
      doc.setFontSize(14);
      let yPosition = 50;
      const splitText = doc.splitTextToSize(analysis.critique, 170);
      doc.text(splitText, 20, yPosition);
      
      // Save PDF
      doc.save(`UI_Analysis_${analysis.id.slice(0, 8)}.pdf`);
      
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  }
};