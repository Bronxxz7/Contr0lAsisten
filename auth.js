import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ELEMENTOS DEL DOM
const authSection = document.getElementById("authSection");
const appWrapper = document.getElementById("appWrapper");

const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

const registerRequestBtn = document.getElementById("registerRequestBtn");
const registerDialog = document.getElementById("registerDialog");
const closeRegisterDialog = document.getElementById("closeRegisterDialog");

// MENSAJES
function showLoginMessage(text, type = "error") {
  if (!loginMessage) return;
  loginMessage.textContent = text;
  loginMessage.className = `auth-message ${type}`;
}

function clearLoginMessage() {
  if (!loginMessage) return;
  loginMessage.textContent = "";
  loginMessage.className = "auth-message hidden";
}

// MODAL REGISTRO
registerRequestBtn?.addEventListener("click", () => {
  registerDialog?.showModal();
});

closeRegisterDialog?.addEventListener("click", () => {
  registerDialog?.close();
});

// LOGIN
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearLoginMessage();

  const email = document.getElementById("loginEmail")?.value.trim() || "";
  const password = document.getElementById("loginPassword")?.value.trim() || "";

  if (!email || !password) {
    showLoginMessage("Completa tu correo y contraseña.", "error");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    showLoginMessage("Acceso correcto.", "success");
  } catch (error) {
    console.error(error);
    showLoginMessage(getAuthErrorMessage(error.code), "error");
  }
});

// DETECTAR SESIÓN
onAuthStateChanged(auth, (user) => {
  if (user) {
    authSection?.classList.add("hidden");
    appWrapper?.classList.remove("hidden");

    window.dispatchEvent(
      new CustomEvent("user-authenticated", { detail: user })
    );
  } else {
    authSection?.classList.remove("hidden");
    appWrapper?.classList.add("hidden");    
  }
});

// MENSAJES DE ERROR
function getAuthErrorMessage(code) {
  const messages = {
    "auth/invalid-email": "Correo inválido.",
    "auth/user-disabled": "Cuenta deshabilitada.",
    "auth/user-not-found": "Usuario no existe.",
    "auth/wrong-password": "Contraseña incorrecta.",
    "auth/invalid-credential": "Datos incorrectos.",
    "auth/too-many-requests": "Demasiados intentos.",
    "auth/operation-not-allowed": "Activa Email/Password en Firebase."
  };

  return messages[code] || `Error: ${code}`;
}

// LOGOUT
export async function logoutUser() {
  await signOut(auth);
}