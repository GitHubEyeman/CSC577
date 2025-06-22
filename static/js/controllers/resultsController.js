import { AuthModel } from '../models/authModel.js';
import { AuthView } from '../views/authView.js';
import { supabaseClient } from '../services/supabaseService.js';

export const ResultsController = {
  async init() {
    try {
      // Check authentication
      const user = await AuthModel.checkAuth();
      if (!user) return;
      
      // Get analysis data from session storage
      const analysisData = JSON.parse(sessionStorage.getItem('currentAnalysis'));
      if (!analysisData) {
        window.location.href = 'insight.html';
        return;
      }
      
      // Get DOM elements
      const loadingIndicator = document.getElementById('loadingIndicator');
      const elementsList = document.getElementById('elementsList');
      const critiqueText = document.getElementById('critiqueText');
      const originalImage = document.getElementById('originalImagePreview');
      const downloadBtn = document.getElementById('downloadPdf');
      
      if (!loadingIndicator || !elementsList || !critiqueText || !originalImage || !downloadBtn) {
        console.error('Missing required DOM elements');
        return;
      }
      
      // Show loading state
      loadingIndicator.style.display = 'block';
      elementsList.innerHTML = '';
      critiqueText.textContent = '';
      
      // Safely access scores with fallback
      const scores = analysisData.scores || {};
      
      // Display elements with scores
      analysisData.elements.forEach((element) => {
        const li = document.createElement('li');
        const score = scores[element] ? (scores[element] * 100).toFixed(1) : 'N/A';
        li.innerHTML = `${element} <span class="confidence-badge">${score}% confidence</span>`;
        elementsList.appendChild(li);
      });
      
      // Display critique with preserved line breaks
      critiqueText.textContent = analysisData.critique;
      
      // Show original image
      const { data: { publicUrl } } = supabaseClient
        .storage
        .from('images')
        .getPublicUrl(analysisData.imageUrl);
      originalImage.src = publicUrl;
      originalImage.style.display = 'block';
      
      // Set up PDF download
      downloadBtn.addEventListener('click', () => this.downloadAsPdf({
        id: analysisData.id || 'temp-id',
        results: {
          elements: analysisData.elements || [],
          critique: analysisData.critique || "No critique available",
          scores: scores
        }
      }));
      
      // Hide loading indicator
      loadingIndicator.style.display = 'none';
      
    } catch (error) {
      console.error('Results initialization error:', error);
      const errorContainer = document.getElementById('analysisResults') || document.body;
      errorContainer.innerHTML = `<p class="message error">Error loading results: ${error.message}</p>`;
    }
  },
  
  async downloadAsPdf(analysis) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.text('UI Design Analysis Report', 105, 20, { align: 'center' });
      
      // Add analysis date
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' });
      
      // Add elements
      doc.setFontSize(14);
      doc.text('Detected UI Elements:', 20, 40);
      let yPosition = 50;
      
      analysis.results.elements.forEach((element, index) => {
        const score = analysis.results.scores[element] ? 
          (analysis.results.scores[element] * 100).toFixed(1) : 'N/A';
        doc.text(`${index + 1}. ${element} (${score}% confidence)`, 20, yPosition);
        yPosition += 10;
      });
      
      // Add critique
      yPosition += 10;
      doc.text('Design Critique:', 20, yPosition);
      yPosition += 10;
      const splitText = doc.splitTextToSize(analysis.results.critique, 170);
      doc.text(splitText, 20, yPosition);
      
      // Save the PDF
      doc.save(`UI_Analysis_${analysis.id.slice(0, 8)}.pdf`);
      
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  }
};