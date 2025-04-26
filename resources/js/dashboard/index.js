import { loadPrivateKey } from '../login/cryptoUtils.js';
import { checkAndLoadUser, setupLogout } from './auth.js';
import { fetchAndRenderDocuments } from './documentList.js';
import { setupUploadHandler } from './documentActions.js';
import { showSessionAlert } from './sessionAlerts.js';

async function initDashboard() {
    await loadPrivateKey();
    await checkAndLoadUser();
    await fetchAndRenderDocuments();
    setupLogout();
    setupUploadHandler();
}

document.addEventListener("DOMContentLoaded", initDashboard);
window.onload = showSessionAlert;
