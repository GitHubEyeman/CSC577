// Initialize Supabase
const supabaseUrl = 'https://fheoiypkkylzahkdinzp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoZW9peXBra3lsemFoa2RpbnpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2MDQwMTQsImV4cCI6MjA2MjE4MDAxNH0.Lt85eJC7wEX11tFHeiK3vPGNfzT9HGrQLPaPMBTTzeA'
const supabase = supabase.createClient(supabaseUrl, supabaseKey)

// Check if user is already logged in
async function checkAuth() {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    document.getElementById('auth-container').style.display = 'none'
    document.getElementById('user-info').style.display = 'block'
    document.getElementById('user-email').textContent = user.email
  }
}

// Register function
async function register() {
  const email = document.getElementById('register-email').value
  const password = document.getElementById('register-password').value
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  })
  
  if (error) {
    alert(error.message)
  } else {
    alert('Registration successful! Check your email for confirmation.')
    checkAuth()
  }
}

// Login function
async function login() {
  const email = document.getElementById('login-email').value
  const password = document.getElementById('login-password').value
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) {
    alert(error.message)
  } else {
    checkAuth()
  }
}

// Logout function
async function logout() {
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    alert(error.message)
  } else {
    document.getElementById('auth-container').style.display = 'block'
    document.getElementById('user-info').style.display = 'none'
  }
}

// Check auth status when page loads
checkAuth()