import { AuthController } from './controllers/authController.js';
import { StorageController } from './controllers/storageController.js';

// Initialize all controllers
document.addEventListener('DOMContentLoaded', () => {
  AuthController.init();
  StorageController.init();
});