const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const displayNameInput = document.getElementById("displayName");
const passwordInput = document.getElementById("password");
const submitBtn = document.getElementById("submitBtn");
const errorMsg = document.getElementById("errorMsg");
const helperMsg = document.getElementById("helperMsg");
const modeLoginBtn = document.getElementById("mode-login");
const modeRegisterBtn = document.getElementById("mode-register");

let mode = "login";

function setMode(nextMode) {
  mode = nextMode;
  const isRegister = mode === "register";

  modeLoginBtn.classList.toggle("active", !isRegister);
  modeRegisterBtn.classList.toggle("active", isRegister);
  displayNameInput.hidden = !isRegister;
  displayNameInput.required = isRegister;
  submitBtn.textContent = isRegister ? "Criar conta" : "Entrar";
  helperMsg.textContent = isRegister
    ? "Crie uma conta de teste totalmente separada do projeto principal."
    : "Entre com um usuário criado neste ambiente de teste rt_*.";
  errorMsg.textContent = "";
}

modeLoginBtn.addEventListener("click", () => setMode("login"));
modeRegisterBtn.addEventListener("click", () => setMode("register"));

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  const display_name = displayNameInput.value.trim() || username;

  errorMsg.textContent = "";
  submitBtn.disabled = true;
  submitBtn.style.opacity = "0.7";

  try {
    if (mode === "register") {
      const registerResponse = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, display_name })
      });

      const registerResult = await registerResponse.json();

      if (!registerResponse.ok || !registerResult.success) {
        errorMsg.textContent = registerResult.message || "Falha ao criar conta.";
        return;
      }

      helperMsg.textContent = "Conta criada. Agora faça login.";
      setMode("login");
      displayNameInput.value = "";
    }

    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    console.error("Erro na autenticação:", err);
    errorMsg.textContent = "Erro ao conectar com o servidor.";
  } finally {
    submitBtn.disabled = false;
    submitBtn.style.opacity = "1";
  }
});
