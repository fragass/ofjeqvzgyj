const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const errorMsg = document.getElementById("errorMsg");
const togglePasswordBtn = document.getElementById("togglePassword");
const submitBtn = document.getElementById("submitBtn");

if (togglePasswordBtn) {
  togglePasswordBtn.addEventListener("click", () => {
    const showing = passwordInput.type === "text";
    passwordInput.type = showing ? "password" : "text";
    togglePasswordBtn.setAttribute("aria-pressed", showing ? "false" : "true");
    togglePasswordBtn.setAttribute("aria-label", showing ? "Mostrar senha" : "Ocultar senha");
  });
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  errorMsg.textContent = "";
  submitBtn.disabled = true;
  submitBtn.textContent = "Entrando...";

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      sessionStorage.setItem("token", result.token);
      sessionStorage.setItem("loggedUser", result.user);
      sessionStorage.setItem("isAdmin", result.isAdmin ? "true" : "false");
      window.location.href = "8617a543f74d88b440f5ba33e1713f063665240f.html";
      return;
    }

    errorMsg.textContent = result.message || "Usuário ou senha inválidos!";
  } catch (err) {
    console.error("Erro no login:", err);
    errorMsg.textContent = "Erro ao conectar com o servidor.";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Entrar";
  }
});
