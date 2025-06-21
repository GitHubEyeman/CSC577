import { AuthModel } from '../models/authModel.js';
import { AuthView } from '../views/authView.js';

export const ProfileController = {
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
    }
};