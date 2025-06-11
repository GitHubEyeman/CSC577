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
        setTimeout(() => window.location.href = 'homepage.html', 1000);
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
      
      if (password !== confirmPassword) {
        AuthView.showMessage(messageEl, 'Passwords do not match!');
        return;
      }
      
      try {
        await AuthModel.register(
          document.getElementById('email').value,
          password
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