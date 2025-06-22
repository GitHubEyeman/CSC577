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
      const overallRating = document.getElementById('overallRating');
      const colorPalette = document.getElementById('colorPalette');
      const colorCritique = document.getElementById('colorCritique');
      const otherFeedback = document.getElementById('otherFeedback');
      const originalImage = document.getElementById('originalImagePreview');
      const downloadBtn = document.getElementById('downloadPdf');
      
      // Show loading state
      if (loadingIndicator) loadingIndicator.style.display = 'block';
      
      // Display results directly from session data
      if (overallRating && analysisData.overall_rating) {
        overallRating.innerHTML = this.formatRating(analysisData.overall_rating);
      }
      
      if (colorPalette && analysisData.color_palette) {
        colorPalette.innerHTML = this.createColorPalette(analysisData.color_palette);
      }
      
      if (colorCritique && analysisData.color_critique) {
        colorCritique.textContent = analysisData.color_critique;
      }
      
      if (otherFeedback && analysisData.other_feedback) {
        otherFeedback.textContent = analysisData.other_feedback;
      }
      
      // Show original image
      if (originalImage) {
        const { data: { publicUrl } } = supabaseClient.storage
          .from('images')
          .getPublicUrl(analysisData.imageUrl);
        originalImage.src = publicUrl;
        originalImage.style.display = 'block';
      }
      
      // Set up PDF download
      if (downloadBtn) {
        downloadBtn.addEventListener('click', () => this.downloadAsPdf(analysisData));
      }
      
      // Hide loading indicator
      if (loadingIndicator) loadingIndicator.style.display = 'none';
      
    } catch (error) {
      console.error('Results initialization error:', error);
      const errorContainer = document.getElementById('otherFeedback') || document.body;
      if (errorContainer) {
        errorContainer.textContent = `Error loading results: ${error.message}`;
      }
    }
  },
  
  formatRating(ratingText) {
    if (!ratingText) return '<div class="rating-value">N/A</div>';
    const match = ratingText.match(/(\d+)\/10/);
    const rating = match ? match[1] : '?';
    return `
      <div class="rating-value">${rating}/10</div>
      <div class="rating-text">${ratingText.replace(/^\d+\/10\s*-\s*/, '')}</div>
    `;
  },
  
  createColorPalette(colors) {
    if (!colors || !Array.isArray(colors)) return '';
    return colors.map(color => `
      <div class="color-swatch" style="background-color: ${color}">
        <span class="color-code">${color}</span>
      </div>
    `).join('');
  },
  
  async downloadAsPdf(analysis) {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4"
        });

        // Set default font
        doc.setFont("helvetica");
        doc.setTextColor(0, 0, 0);

        // Add header
        doc.setFontSize(20);
        doc.setTextColor(45, 55, 72);
        doc.text("UI Design Analysis Report", 105, 20, { align: "center" });
        
        // Add divider line
        doc.setDrawColor(109, 180, 123);
        doc.setLineWidth(0.5);
        doc.line(20, 25, 190, 25);

        // Add date
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 32, { align: "center" });

        // Add overall rating section with word wrapping
        doc.setFontSize(14);
        doc.setTextColor(45, 55, 72);
        doc.text("Overall Usability Rating", 20, 45);
        
        // Split rating text into multiple lines if needed
        const ratingText = analysis.overall_rating || 'Not rated';
        const splitRating = doc.splitTextToSize(ratingText, 170); // 170mm width
        
        doc.setFontSize(12);
        doc.text(splitRating, 20, 52);

        // Calculate dynamic Y position based on rating text height
        let yPos = 52 + (splitRating.length * 5); // 5mm per line
        
        // Add color palette section
        doc.setFontSize(14);
        doc.text("Color Palette Analysis", 20, yPos + 10);
        
        if (analysis.color_palette?.length > 0) {
            // Draw color swatches
            let xPos = 20;
            yPos += 15; // Move down for swatches
            
            analysis.color_palette.forEach((color) => {
                if (xPos > 160) { // New row if needed
                    xPos = 20;
                    yPos += 15;
                }
                
                doc.setFillColor(color);
                doc.rect(xPos, yPos, 10, 10, 'F');
                doc.setFontSize(8);
                doc.text(color, xPos, yPos + 13);
                xPos += 25;
            });
            yPos += 20; // Extra space after swatches
        } else {
            doc.setFontSize(12);
            doc.text("No color palette detected", 20, yPos + 15);
            yPos += 20;
        }

        // Add color critique section
        doc.setFontSize(14);
        doc.text("Color Critique", 20, yPos + 10);
        
        doc.setFontSize(11);
        const colorCritiqueLines = doc.splitTextToSize(
            analysis.color_critique || "No color critique available", 
            170
        );
        doc.text(colorCritiqueLines, 20, yPos + 17);
        
        // Calculate new Y position after color critique
        yPos += 17 + (colorCritiqueLines.length * 4);

        // Add other feedback section
        doc.setFontSize(14);
        doc.text("Detailed Feedback", 20, yPos + 10);
        
        doc.setFontSize(11);
        const otherFeedbackLines = doc.splitTextToSize(
            analysis.other_feedback || "No additional feedback available", 
            170
        );
        doc.text(otherFeedbackLines, 20, yPos + 17);

        // Add footer
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text("Generated by UI Analyzer", 105, 287, { align: "center" });

        // Save PDF
        doc.save(`UI_Analysis_${analysis.analysis_id?.slice(0, 8) || new Date().getTime()}.pdf`);
        
    } catch (error) {
        console.error('PDF generation failed:', error);
        alert('Failed to generate PDF. Please try again.');
    }
  }
};