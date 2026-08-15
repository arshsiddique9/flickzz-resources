// Publisher Panel Logic
import { authState, requirePublisher } from "./auth.js";
import { createResource, listResources, CATEGORY_META, formatNumber, formatDate } from "./resources-api.js";
import { showToast, translateFirebaseError } from "./main.js";

let myResources = [];

// Protect page
requirePublisher().then(() => {
    document.getElementById('userName').textContent = authState.user.displayName || authState.user.email.split('@')[0];
    document.getElementById('userEmail').textContent = authState.user.email;
    loadMyResources();
});

async function loadMyResources() {
    const tbody = document.getElementById('myResourcesTable');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;"><span class="spinner"></span> Loading...</td></tr>';
    
    try {
        const all = await listResources({ max: 500 });
        myResources = all.filter(r => r.uploadedBy === authState.user.uid);
        
        document.getElementById('myResourcesCount').textContent = myResources.length;
        document.getElementById('myDownloadsCount').textContent = formatNumber(myResources.reduce((sum, r) => sum + (r.downloads || 0), 0));
        
        if (!myResources.length) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-muted);">No resources yet. Upload your first one above!</td></tr>';
            return;
        }
        
        tbody.innerHTML = myResources.map(r => {
            const cat = CATEGORY_META[r.category] || { label: r.category };
            return `<tr>
                <td><strong>${escapeHtml(r.title)}</strong></td>
                <td><span class="table-badge">${escapeHtml(cat.label)}</span></td>
                <td>${formatNumber(r.downloads || 0)}</td>
                <td><span class="status-badge status-active">Published</span></td>
                <td><a href="resource-detail.html?id=${r.id}" class="icon-btn" title="View"><i class="fas fa-eye"></i></a></td>
            </tr>`;
        }).join('');
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--danger);">Error loading resources</td></tr>';
    }
}

document.getElementById('publisherUploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('pubSubmitBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Publishing...';
    
    try {
        await createResource({
            title: document.getElementById('pubTitle').value.trim(),
            category: document.getElementById('pubCategory').value,
            tagline: document.getElementById('pubTagline').value.trim(),
            description: document.getElementById('pubDescription').value.trim(),
            version: document.getElementById('pubVersion').value.trim(),
            mcVersion: document.getElementById('pubMcVersion').value.trim(),
            thumbnail: document.getElementById('pubThumbnail').value.trim(),
            fileUrl: document.getElementById('pubFileUrl').value.trim(),
            fileName: document.getElementById('pubFileUrl').value.split('/').pop() || 'resource',
            uploadedBy: authState.user.uid,
            featured: false
        });
        showToast('Resource published successfully!', 'success');
        e.target.reset();
        loadMyResources();
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-upload"></i> Publish Resource';
    }
});

function escapeHtml(s) { if (!s) return ''; return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
