const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const errorMsg = document.getElementById("errorMsg");
const submitBtn = document.getElementById("submitBtn");
const togglePassword = document.getElementById("togglePassword");

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.hidden = false;
}

function clearError() {
  errorMsg.textContent = "";
  errorMsg.hidden = true;
}

togglePassword.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  togglePassword.classList.toggle("hideShowPassword-toggle-hide", isPassword);
  togglePassword.setAttribute("aria-label", isPassword ? "Ocultar senha" : "Mostrar senha");
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    showError("Informe login e senha.");
    return;
  }

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

    showError(result.message || "Usuário ou senha inválidos!");
  } catch (err) {
    console.error("Erro no login:", err);
    showError("Erro ao conectar com o servidor.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Entrar";
  }
});
