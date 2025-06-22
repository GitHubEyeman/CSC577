import { AuthModel } from '../models/authModel.js';
import { AuthView } from '../views/authView.js';
import { supabaseClient } from '../services/supabaseService.js';

export const ResultsController = {
  async init() {
    try {
      console.log("[DEBUG] Initializing results controller...");
      
      // Check authentication
      const user = await AuthModel.checkAuth();
      if (!user) {
        console.log("[DEBUG] User not authenticated, redirecting");
        window.location.href = 'login.html';
        return;
      }

       // Get analysis ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const analysisId = urlParams.get('analysis_id');

        // Special handling for newly generated analyses
        if (analysisId && !sessionStorage.getItem('currentAnalysis')) {
            const freshData = await this.fetchAnalysisData(analysisId, user.id);
            if (freshData) {
                sessionStorage.setItem('currentAnalysis', JSON.stringify(freshData));
            }
        }

      // Try to get from sessionStorage
      let analysisData = JSON.parse(sessionStorage.getItem('currentAnalysis'));
      console.log("[DEBUG] SessionStorage data:", analysisData);

      // If no session data but we have an ID, fetch from server
      if ((!analysisData || !analysisData.id) && analysisId) {
        console.log("[DEBUG] Fetching analysis from server...");
        analysisData = await this.fetchAnalysisData(analysisId, user.id);
        console.log("[DEBUG] Fetched analysis data:", analysisData);
        
        if (analysisData) {
          sessionStorage.setItem('currentAnalysis', JSON.stringify(analysisData));
        }
      }

      if (!analysisData) {
        console.log("[DEBUG] No analysis data found, redirecting");
        window.location.href = 'insight.html';
        return;
      }

      console.log("[DEBUG] Final analysis data:", analysisData);
      
      // Show loading indicator
      const loadingIndicator = document.getElementById('loadingIndicator');
      if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
        console.log("[DEBUG] Loading indicator shown");
      }

      // Display the results
      await this.displayAnalysisResults(analysisData);

      // Hide loading indicator
      if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
        console.log("[DEBUG] Loading indicator hidden");
      }

    } catch (error) {
      console.error('Results initialization error:', error);
      const errorContainer = document.getElementById('otherFeedback') || document.body;
      if (errorContainer) {
        errorContainer.textContent = `Error loading results: ${error.message}`;
      }
    }
  },

  async displayAnalysisResults(analysisData) {
    console.log("[DEBUG] Displaying analysis results...");
    
    // Verify DOM elements exist
    const elements = {
      overallRating: document.getElementById('overallRating'),
      colorPalette: document.getElementById('colorPalette'),
      colorCritique: document.getElementById('colorCritique'),
      otherFeedback: document.getElementById('otherFeedback'),
      originalImage: document.getElementById('originalImagePreview'),
      downloadBtn: document.getElementById('downloadPdf')
    };

    console.log("[DEBUG] DOM elements:", elements);

    // Display overall rating
    if (elements.overallRating) {
      try {
        elements.overallRating.innerHTML = this.formatRating(analysisData.overall_rating || 'No rating available');
        console.log("[DEBUG] Overall rating displayed");
      } catch (e) {
        console.error("Error displaying rating:", e);
        elements.overallRating.innerHTML = '<div class="error">Error displaying rating</div>';
      }
    }

    // Display color palette
    if (elements.colorPalette) {
      try {
        elements.colorPalette.innerHTML = this.createColorPalette(analysisData.color_palette || []);
        console.log("[DEBUG] Color palette displayed");
      } catch (e) {
        console.error("Error displaying color palette:", e);
        elements.colorPalette.innerHTML = '<div class="error">Error displaying color palette</div>';
      }
    }

    // Display color critique
    if (elements.colorCritique) {
      try {
        elements.colorCritique.textContent = analysisData.color_critique || 'No color critique available';
        console.log("[DEBUG] Color critique displayed");
      } catch (e) {
        console.error("Error displaying color critique:", e);
        elements.colorCritique.textContent = 'Error displaying color critique';
      }
    }

    // Display other feedback
    if (elements.otherFeedback) {
      try {
        elements.otherFeedback.textContent = analysisData.other_feedback || 'No additional feedback available';
        console.log("[DEBUG] Other feedback displayed");
      } catch (e) {
        console.error("Error displaying other feedback:", e);
        elements.otherFeedback.textContent = 'Error displaying feedback';
      }
    }

    // Display original image
    if (elements.originalImage && analysisData.imageUrl) {
      try {
        const { data: { publicUrl } } = supabaseClient.storage
          .from('images')
          .getPublicUrl(analysisData.imageUrl);
        console.log("[DEBUG] Image URL:", publicUrl);
        
        elements.originalImage.onload = () => {
          console.log("[DEBUG] Image loaded successfully");
          elements.originalImage.style.display = 'block';
        };
        elements.originalImage.onerror = () => {
          console.error("[DEBUG] Error loading image");
          elements.originalImage.style.display = 'none';
        };
        elements.originalImage.src = publicUrl;
      } catch (e) {
        console.error("Error displaying image:", e);
      }
    }

    // Set up PDF download
    if (elements.downloadBtn) {
      elements.downloadBtn.addEventListener('click', () => this.downloadAsPdf(analysisData));
      console.log("[DEBUG] PDF download button setup");
    }
  },
  
  async fetchAnalysisData(analysisId, userId) {
    try {
        const { data, error } = await supabaseClient
            .from('analyses')
            .select(`
                id,
                analysis_id,
                image_url,
                results,
                color_palette,
                overall_rating,
                color_critique,
                other_feedback,
                created_at
            `)
            .eq('analysis_id', analysisId)
            .eq('user_id', userId)
            .single();

        if (error) throw error;
        if (!data) throw new Error('Analysis not found');

        // Handle both old and new data formats
        return {
            id: data.analysis_id,
            imageUrl: data.image_url,
            color_palette: data.results?.color_palette || data.color_palette || [],
            overall_rating: data.results?.overall_rating || data.overall_rating || 'No rating available',
            color_critique: data.results?.color_critique || data.color_critique || 'No color critique available',
            other_feedback: data.results?.other_feedback || data.other_feedback || 'No additional feedback available'
        };
    } catch (error) {
        console.error('Error fetching analysis data:', error);
        throw error;
    }
},

  formatRating(ratingText) {
    if (!ratingText) return '<div class="rating-value">N/A</div>';
    const match = ratingText.match(/(\d+(\.\d+)?)\/10/);
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