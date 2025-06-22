import { AuthController } from './controllers/authController.js';
import { StorageController } from './controllers/storageController.js';
import { ProfileController } from './controllers/profileController.js';
import { ResultsController } from './controllers/resultsController.js';

// Initialize all controllers
document.addEventListener('DOMContentLoaded', () => {
  AuthController.init();
  StorageController.init();
  if (window.location.pathname.includes('profile.html')) {
    ProfileController.init();
  }
  
  if (window.location.pathname.includes('results.html')) {
    ResultsController.init();
  }
});