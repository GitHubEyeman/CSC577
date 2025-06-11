export const AuthView = {
  showMessage(element, message, type = 'error') {
    element.textContent = message;
    element.className = `message ${type}`;
    element.style.display = 'block';
  },

  updateUserEmail(element, email) {
    if (element) element.textContent = email;
  },

  resetForm(formId) {
    const form = document.getElementById(formId);
    if (form) form.reset();
  }
};