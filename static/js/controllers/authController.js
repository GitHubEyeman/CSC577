import { AuthModel } from '../models/authModel.js';
import { AuthView } from '../views/authView.js';

export const AuthController = {
  init() {
    this.initLogin();
    this.initRegister();
    this.initLogout();
    this.protectRoutes();
  },

  async protectRoutes() {
    const publicPages = ['index.html', 'login.html', 'register.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (publicPages.includes(currentPage)) return;
    
    const user = await AuthModel.checkAuth();
    if (user) AuthView.updateUserEmail(document.getElementById('userEmail'), user.email);
  },

  initLogin() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const messageEl = document.getElementById('message');
      
      try {
        await AuthModel.login(
          document.getElementById('email').value,
          document.getElementById('password').value
        );
        
        AuthView.showMessage(messageEl, 'Login successful! Redirecting...', 'success');
        setTimeout(() => window.location.href = 'profile.html', 1000);
      } catch (error) {
        AuthView.showMessage(messageEl, error.message);
      }
    });
  },

  initRegister() {
    const form = document.getElementById('registerForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const messageEl = document.getElementById('message');
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      
      // Validate password match
      if (password !== confirmPassword) {
        AuthView.showMessage(messageEl, 'Passwords do not match!');
        return;
      }
      
      // Validate date of birth
      const dob = new Date(document.getElementById('dob').value);
      const minAgeDate = new Date();
      minAgeDate.setFullYear(minAgeDate.getFullYear() - 13); // Example: minimum 13 years old
      
      if (dob > minAgeDate) {
        AuthView.showMessage(messageEl, 'You must be at least 13 years old to register');
        return;
      }
      
      try {
        const userData = {
          name: document.getElementById('name').value,
          dob: document.getElementById('dob').value
        };
        
        await AuthModel.register(
          document.getElementById('email').value,
          password,
          userData
        );
        
        AuthView.showMessage(messageEl, 'Registration successful!', 'success');
        AuthView.resetForm('registerForm');
        setTimeout(() => window.location.href = 'login.html', 3000);
      } catch (error) {
        AuthView.showMessage(messageEl, error.message);
      }
    });
  },

  initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    
    logoutBtn.addEventListener('click', async () => {
      try {
        await AuthModel.logout();
        window.location.href = 'login.html';
      } catch (error) {
        console.error('Logout error:', error);
      }
    });
  }
};