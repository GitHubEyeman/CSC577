import { AuthModel } from '../models/authModel.js';
import { AuthView } from '../views/authView.js';
import { supabaseClient } from '../services/supabaseService.js';

export const ProfileController = {
    currentPage: 1,
    itemsPerPage: 5, // Adjust as needed
    currentLayout: 'table', // 'table' or 'cards'
    totalPages: 1,
    currentHistory: [],
    
    async init() {
        try {
            // Check authentication
            const user = await AuthModel.checkAuth();
            if (!user) return;
            
            // Get elements
            const emailEl = document.getElementById('profile-email');
            const nameInput = document.getElementById('profile-name');
            const dobInput = document.getElementById('profile-dob');
            const editBtn = document.getElementById('edit-btn');
            const saveBtn = document.getElementById('save-btn');
            const cancelBtn = document.getElementById('cancel-btn');
            
            // Create message element container (only once)
            let messageContainer = document.querySelector('.message-container');
            if (!messageContainer) {
                messageContainer = document.createElement('div');
                messageContainer.className = 'message-container';
                document.querySelector('.profile-info').prepend(messageContainer);
            }
            
            // Load profile data
            try {
                const profile = await AuthModel.getProfile(user.id);
                
                // Display data
                emailEl.textContent = user.email;
                nameInput.value = profile.full_name || '';
                dobInput.value = profile.date_of_birth || '';
                
                // Set up edit functionality
                editBtn.addEventListener('click', () => {
                    nameInput.disabled = false;
                    dobInput.disabled = false;
                    nameInput.classList.add('editing');
                    dobInput.classList.add('editing');
                    editBtn.style.display = 'none';
                    saveBtn.style.display = 'inline-block';
                    cancelBtn.style.display = 'inline-block';
                });
                
                cancelBtn.addEventListener('click', () => {
                    nameInput.disabled = true;
                    dobInput.disabled = true;
                    nameInput.classList.remove('editing');
                    dobInput.classList.remove('editing');
                    nameInput.value = profile.full_name || '';
                    dobInput.value = profile.date_of_birth || '';
                    editBtn.style.display = 'inline-block';
                    saveBtn.style.display = 'none';
                    cancelBtn.style.display = 'none';
                    
                    // Clear any existing messages
                    messageContainer.innerHTML = '';
                });
                
                saveBtn.addEventListener('click', async () => {
                    try {
                        const updates = {
                            full_name: nameInput.value,
                            date_of_birth: dobInput.value
                        };
                        
                        await AuthModel.updateProfile(user.id, updates);
                        
                        // Update UI
                        nameInput.disabled = true;
                        dobInput.disabled = true;
                        nameInput.classList.remove('editing');
                        dobInput.classList.remove('editing');
                        editBtn.style.display = 'inline-block';
                        saveBtn.style.display = 'none';
                        cancelBtn.style.display = 'none';
                        
                        // Show success message
                        const messageEl = document.createElement('div');
                        messageEl.className = 'message success';
                        messageEl.textContent = 'Profile updated successfully!';
                        messageContainer.innerHTML = '';
                        messageContainer.appendChild(messageEl);
                        
                        // Update the profile data reference
                        profile.full_name = nameInput.value;
                        profile.date_of_birth = dobInput.value;
                        
                    } catch (error) {
                        const messageEl = document.createElement('div');
                        messageEl.className = 'message error';
                        messageEl.textContent = error.message;
                        messageContainer.innerHTML = '';
                        messageContainer.appendChild(messageEl);
                    }
                });




                // Add layout toggle functionality
                const toggleTable = document.getElementById('toggle-table');
                const toggleCards = document.getElementById('toggle-cards');
                const tableView = document.getElementById('table-view');
                const cardView = document.getElementById('card-view');
                
                if (toggleTable && toggleCards) {
                    toggleTable.addEventListener('click', () => {
                        this.currentLayout = 'table';
                        tableView.style.display = 'block';
                        cardView.style.display = 'none';
                        toggleTable.classList.add('active');
                        toggleCards.classList.remove('active');
                        this.renderHistory();
                    });
                    
                    toggleCards.addEventListener('click', () => {
                        this.currentLayout = 'cards';
                        tableView.style.display = 'none';
                        cardView.style.display = 'block';
                        toggleCards.classList.add('active');
                        toggleTable.classList.remove('active');
                        this.renderHistory();
                    });
                }
                // Load feedback history
                await this.loadFeedbackHistory(user.id);


            } catch (error) {
                console.error('Error loading profile:', error);
                const messageEl = document.createElement('div');
                messageEl.className = 'message error';
                messageEl.textContent = 'Failed to load profile data';
                messageContainer.innerHTML = '';
                messageContainer.appendChild(messageEl);
            }
        } catch (error) {
            console.error('Initialization error:', error);
        }
    },

    async loadFeedbackHistory(userId) {
        try {
            const noFeedbackMessage = document.getElementById('no-feedback-message');
            
            // Fetch analysis history from your backend
            const history = await AuthModel.getAnalysisHistory(userId);
            
            if (!history || history.length === 0) {
                noFeedbackMessage.style.display = 'block';
                return;
            }
            
            noFeedbackMessage.style.display = 'none';
            this.currentHistory = history;
            this.totalPages = Math.ceil(history.length / this.itemsPerPage);
            
            // Initialize pagination
            this.setupPagination();
            
            // Render initial view
            this.renderHistory();
        } catch (error) {
            console.error('Error loading feedback history:', error);
        }
    },
    
    setupPagination() {
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        const pageInfo = document.getElementById('page-info');
        
        const prevBtnCards = document.getElementById('prev-page-cards');
        const nextBtnCards = document.getElementById('next-page-cards');
        const pageInfoCards = document.getElementById('page-info-cards');
        
        const updatePagination = () => {
            // Update buttons
            prevBtn.disabled = this.currentPage === 1;
            nextBtn.disabled = this.currentPage === this.totalPages;
            prevBtnCards.disabled = this.currentPage === 1;
            nextBtnCards.disabled = this.currentPage === this.totalPages;
            
            // Update page info
            pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
            pageInfoCards.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
        };
        
        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.renderHistory();
                    updatePagination();
                }
            });
            
            nextBtn.addEventListener('click', () => {
                if (this.currentPage < this.totalPages) {
                    this.currentPage++;
                    this.renderHistory();
                    updatePagination();
                }
            });
        }
        
        if (prevBtnCards && nextBtnCards) {
            prevBtnCards.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.renderHistory();
                    updatePagination();
                }
            });
            
            nextBtnCards.addEventListener('click', () => {
                if (this.currentPage < this.totalPages) {
                    this.currentPage++;
                    this.renderHistory();
                    updatePagination();
                }
            });
        }
        
        updatePagination();
    },
    
    renderHistory() {
        if (this.currentLayout === 'table') {
            this.renderTableView();
        } else {
            this.renderCardView();
        }
    },
    
    renderTableView() {
        const historyContainer = document.getElementById('feedback-history-body');
        if (!historyContainer) return;
        
        historyContainer.innerHTML = '';
        
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, this.currentHistory.length);
        
        for (let i = startIndex; i < endIndex; i++) {
            const analysis = this.currentHistory[i];
            const row = document.createElement('tr');
            
            // Number column
            const numCell = document.createElement('td');
            numCell.textContent = i + 1;
            row.appendChild(numCell);
            
            // Preview column
            const previewCell = document.createElement('td');
            const previewImg = document.createElement('img');
            previewImg.src = supabaseClient.storage.from('images').getPublicUrl(analysis.image_url).data.publicUrl;
            previewImg.className = 'thumbnail-img';
            previewCell.appendChild(previewImg);
            row.appendChild(previewCell);
            
            // Date column
            const dateCell = document.createElement('td');
            dateCell.textContent = new Date(analysis.created_at).toLocaleDateString();
            row.appendChild(dateCell);
            
            // Rating column
            const ratingCell = document.createElement('td');
            if (analysis.overall_rating) {
                const match = analysis.overall_rating.match(/(\d+)\/10/);
                const rating = match ? match[1] : '?';
                ratingCell.textContent = `${rating}/10`;
            } else {
                ratingCell.textContent = 'N/A';
            }
            row.appendChild(ratingCell);
            
            // Actions column
            const actionsCell = document.createElement('td');
            actionsCell.className = 'actions-cell';
            
            const viewBtn = document.createElement('button');
            viewBtn.className = 'button-primary small-btn';
            viewBtn.textContent = 'View';
            viewBtn.addEventListener('click', () => this.viewAnalysis(analysis));
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'button-danger small-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteAnalysis(analysis.id, i);
            });
            
            actionsCell.appendChild(viewBtn);
            actionsCell.appendChild(deleteBtn);
            row.appendChild(actionsCell);
            
            historyContainer.appendChild(row);
        }
    },
    
    renderCardView() {
        const cardsContainer = document.getElementById('feedback-cards-container');
        if (!cardsContainer) return;
        
        cardsContainer.innerHTML = '';
        
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, this.currentHistory.length);
        
        for (let i = startIndex; i < endIndex; i++) {
            const analysis = this.currentHistory[i];
            const card = document.createElement('div');
            card.className = 'feedback-card';
            
            // Card header with date
            const cardHeader = document.createElement('div');
            cardHeader.className = 'card-header';
            cardHeader.textContent = new Date(analysis.created_at).toLocaleDateString();
            card.appendChild(cardHeader);
            
            // Image preview
            const imgContainer = document.createElement('div');
            imgContainer.className = 'card-img-container';
            const previewImg = document.createElement('img');
            previewImg.src = supabaseClient.storage.from('images').getPublicUrl(analysis.image_url).data.publicUrl;
            previewImg.className = 'card-img';
            imgContainer.appendChild(previewImg);
            card.appendChild(imgContainer);
            
            // Rating
            const ratingDiv = document.createElement('div');
            ratingDiv.className = 'card-rating';
            if (analysis.overall_rating) {
                const match = analysis.overall_rating.match(/(\d+)\/10/);
                const rating = match ? match[1] : '?';
                ratingDiv.textContent = `Rating: ${rating}/10`;
            } else {
                ratingDiv.textContent = 'Rating: N/A';
            }
            card.appendChild(ratingDiv);
            
            // Actions
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'card-actions';
            
            const viewBtn = document.createElement('button');
            viewBtn.className = 'button-primary small-btn';
            viewBtn.textContent = 'View';
            viewBtn.addEventListener('click', () => this.viewAnalysis(analysis));
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'button-danger small-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteAnalysis(analysis.id, i);
            });
            
            actionsDiv.appendChild(viewBtn);
            actionsDiv.appendChild(deleteBtn);
            card.appendChild(actionsDiv);
            
            cardsContainer.appendChild(card);
        }
    },
    
    viewAnalysis(analysis) {
        // Ensure we have the correct analysis ID
        const analysisId = analysis.id || analysis.analysis_id;
        if (!analysisId) {
            console.error('No analysis ID found in:', analysis);
            alert('Could not view this analysis - missing ID');
            return;
        }

        // Extract results from analysis data
        const results = analysis.results || {};

        // Store in sessionStorage for immediate access
        sessionStorage.setItem('currentAnalysis', JSON.stringify({
            id: analysisId,
            imageUrl: analysis.image_url,
            color_palette: results.color_palette || [],
            overall_rating: results.overall_rating || 'No rating available',
            color_critique: results.color_critique || 'No color critique available',
            other_feedback: results.other_feedback || 'No additional feedback available'
        }));
        
        // Redirect with the analysis ID in the URL
        window.location.href = `results.html?analysis_id=${analysisId}`;
    },
    
    async deleteAnalysis(analysisId, index) {
        if (confirm('Are you sure you want to delete this analysis?')) {
            try {
                // Call your backend to delete the analysis
                await AuthModel.deleteAnalysis(analysisId);
                
                // Remove from local history
                this.currentHistory.splice(index, 1);
                
                // Recalculate total pages
                this.totalPages = Math.ceil(this.currentHistory.length / this.itemsPerPage);
                
                // Adjust current page if needed
                if (this.currentPage > this.totalPages && this.totalPages > 0) {
                    this.currentPage = this.totalPages;
                }
                
                // Re-render
                this.renderHistory();
                this.setupPagination();
                
                // Show success message
                alert('Analysis deleted successfully');
            } catch (error) {
                console.error('Error deleting analysis:', error);
                alert('Failed to delete analysis');
            }
        }
    }
};