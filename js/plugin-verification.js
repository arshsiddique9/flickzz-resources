// js/plugin-verification.js
import { authState, onAuthReady } from "./auth.js";
import { showToast } from "./main.js";

onAuthReady((state) => {
    if (!state.user) {
        // Redirect to login if not logged in
        sessionStorage.setItem('redirectAfterLogin', '/plugin-verification.html');
        window.location.href = 'login.html';
    }
});

const form = document.getElementById('verificationForm');
const resultBox = document.getElementById('resultBox');
const installId = document.getElementById('installId');
const installStatus = document.getElementById('installStatus');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const plugin = document.getElementById('pluginName').value;
    const licenseKey = document.getElementById('licenseKey').value.trim();
    const serverName = document.getElementById('serverName').value.trim();

    if (!plugin || !licenseKey) {
        showToast('Please select a plugin and enter license key', 'warning');
        return;
    }

    const btn = document.getElementById('verifyBtn');
    setLoading(btn, true, 'Verifying...');

    try {
        // Generate unique installation ID (client-side)
        const installationId = `INST-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

        const res = await fetch('/api/plugin-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                plugin,
                licenseId: licenseKey,
                installationId,
                pluginVersion: '1.0.0',
                mcVersion: '1.21',
                heartbeat: true
            })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Verification failed');
        }

        // Show result
        resultBox.style.display = 'block';
        installId.textContent = installationId;
        installStatus.textContent = '✅ Verified';
        installStatus.style.color = 'var(--success)';

        showToast('License verified successfully! Installation ID generated.', 'success');

        // Copy ID button
        document.getElementById('copyInstallId').addEventListener('click', () => {
            navigator.clipboard.writeText(installationId);
            showToast('Installation ID copied!', 'success');
        });

    } catch (err) {
        showToast(err.message, 'error');
        resultBox.style.display = 'block';
        installId.textContent = '—';
        installStatus.textContent = '❌ Failed';
        installStatus.style.color = 'var(--danger)';
    } finally {
        setLoading(btn, false, 'Generate Token');
    }
});

function setLoading(btn, loading, text) {
    btn.disabled = loading;
    btn.innerHTML = loading ? '<span class="spinner"></span> ' + text : '<span>' + text + '</span>';
}
