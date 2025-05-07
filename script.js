const supabase = supabase.createClient("https://fheoiypkkylzahkdinzp.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoZW9peXBra3lsemFoa2RpbnpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2MDQwMTQsImV4cCI6MjA2MjE4MDAxNH0.Lt85eJC7wEX11tFHeiK3vPGNfzT9HGrQLPaPMBTTzeA");

async function signup() {
  const { user, error } = await supabase.auth.signUp({
    email: document.getElementById("email").value,
    password: document.getElementById("password").value
  });
  alert(error ? error.message : "Check your email to confirm!");
}

async function login() {
  const { user, error } = await supabase.auth.signInWithPassword({
    email: document.getElementById("email").value,
    password: document.getElementById("password").value
  });
  if (error) return alert(error.message);
  alert("Logged in!");
  loadHistory();
}

async function uploadImage() {
  const file = document.getElementById("upload").files[0];
  const user = (await supabase.auth.getUser()).data.user;

  if (!file || !user) return alert("Login and select a file");

  const fileName = `${user.id}-${Date.now()}.png`;
  const { data, error } = await supabase.storage.from("uploads").upload(fileName, file);
  if (error) return alert("Upload failed: " + error.message);

  const imageUrl = `https://YOUR_SUPABASE_PROJECT.supabase.co/storage/v1/object/public/uploads/${fileName}`;

  // Normally you'd call your AI backend here, but we’ll fake it for now
  const fakeFeedback = "This UI has clean layout but poor contrast. Consider improving accessibility.";

  const { error: insertError } = await supabase.from("ui_feedback").insert({
    user_id: user.id,
    image_url: imageUrl,
    feedback: fakeFeedback
  });

  alert(insertError ? insertError.message : "Uploaded and saved!");
  loadHistory();
}

async function loadHistory() {
  const user = (await supabase.auth.getUser()).data.user;
  const { data, error } = await supabase.from("ui_feedback").select("*").eq("user_id", user.id).order("created_at", { ascending: false });

  const container = document.getElementById("history");
  container.innerHTML = "";
  data.forEach(entry => {
    container.innerHTML += `
      <div>
        <img src="${entry.image_url}" width="200"><br>
        <strong>Feedback:</strong> ${entry.feedback}<br><hr>
      </div>
    `;
  });
}
