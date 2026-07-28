// admin.js (Direct Login – No OTP)
import { authState, onAuthReady, logout } from "./auth.js";
import { isOwner, OWNER_EMAIL } from "./firebase-config.js";
// ... saare imports (resources-api, feedback-api, etc.)

// DOM REFS
const accessDenied = document.getElementById('accessDenied');
const loginRequired = document.getElementById('loginRequired');
const adminContent = document.getElementById('adminContent');

(async function init() {
    hideAll();

    await new Promise(resolve => onAuthReady(resolve));

    if (!authState.user) {
        loginRequired.classList.remove('hidden');
        sessionStorage.setItem('redirectAfterLogin', '/flickzz-control-panel-x7k.html');
        return;
    }

    if (!authState.isOwner && !authState.isAdmin) {
        accessDenied.classList.remove('hidden');
        console.warn(`[Security] Unauthorized admin access attempt by ${authState.user.email}`);
        return;
    }

    // ✅ Owner hai – admin panel dikhao
    unlock();
})();

function hideAll() {
    accessDenied.classList.add('hidden');
    loginRequired.classList.add('hidden');
    adminContent.classList.add('hidden');
}

function unlock() {
    hideAll();
    adminContent.classList.remove('hidden');
    bootstrap();
}

// ... baaki saara code (bootstrap, loadStats, bindSidebar, etc.) same rahega
