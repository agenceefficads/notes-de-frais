// Configuration - REMPLACEZ PAR VOTRE URL WEBHOOK N8N
const WEBHOOK_URL = 'https://n8n.srv910637.hstgr.cloud/webhook/notes-frais';

// Variables globales
let selectedFile = null;

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    setupFormHandlers();
    setupFileUpload();
    setDefaultDate();
});

function setupFormHandlers() {
    const form = document.getElementById('notesForm');
    form.addEventListener('submit', handleFormSubmit);

    // Auto-calcul du montant HT
    const montantTTC = document.getElementById('montant_ttc');
    const montantHT = document.getElementById('montant_ht');
    
    montantTTC.addEventListener('input', function() {
        if (this.value && !montantHT.value) {
            const ttc = parseFloat(this.value);
            const ht = (ttc / 1.20).toFixed(2);
            montantHT.value = ht;
        }
    });
}

function setupFileUpload() {
    const fileInput = document.getElementById('justificatif');
    const dropZone = document.getElementById('fileDropZone');
    
    // Gestion du drag & drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#5a67d8';
        dropZone.style.background = 'linear-gradient(135deg, #f0f4ff 0%, #dce7ff 100%)';
    });
    
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#667eea';
        dropZone.style.background = 'linear-gradient(135deg, #f8f9ff 0%, #e8f0ff 100%)';
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
        dropZone.style.borderColor = '#667eea';
        dropZone.style.background = 'linear-gradient(135deg, #f8f9ff 0%, #e8f0ff 100%)';
    });
    
    // Gestion de la sélection de fichier
    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            handleFileSelect(this.files[0]);
        }
    });
}

function handleFileSelect(file) {
    // Validation du fichier
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    
    if (file.size > maxSize) {
        showError('Le fichier est trop volumineux (max 10MB)');
        return;
    }
    
    if (!allowedTypes.includes(file.type)) {
        showError('Format de fichier non supporté. Utilisez PDF, JPG ou PNG.');
        return;
    }
    
    selectedFile = file;
    displayFilePreview(file);
}

function displayFilePreview(file) {
    const uploadContent = document.querySelector('.upload-content');
    const filePreview = document.getElementById('filePreview');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    
    uploadContent.style.display = 'none';
    filePreview.style.display = 'block';
}

function removeFile() {
    selectedFile = null;
    const uploadContent = document.querySelector('.upload-content');
    const filePreview = document.getElementById('filePreview');
    const fileInput = document.getElementById('justificatif');
    
    fileInput.value = '';
    uploadContent.style.display = 'block';
    filePreview.style.display = 'none';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date_frais').value = today;
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    
    // Désactiver le bouton et afficher le loader
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline';
    
    try {
        const formData = await collectFormData();
        const response = await submitToWebhook(formData);
        
        if (response.ok) {
            showSuccess();
            resetForm();
        } else {
            throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Erreur soumission:', error);
        showError('Erreur lors de la soumission: ' + error.message);
    } finally {
        // Réactiver le bouton
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

async function collectFormData() {
    const form = document.getElementById('notesForm');
    const formData = {};
    
    // Collecter tous les champs du formulaire
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if (input.type !== 'file') {
            formData[input.name] = input.value;
        }
    });
    
    // Traiter le fichier si présent
    if (selectedFile) {
        const fileData = await convertFileToBase64(selectedFile);
        formData.justificatif = {
            name: selectedFile.name,
            size: selectedFile.size,
            mimeType: selectedFile.type,
            content: fileData
        };
    }
    
    return formData;
}

function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1]; // Supprimer le préfixe data:
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function submitToWebhook(formData) {
    return fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
    });
}

function showSuccess() {
    const modal = document.getElementById('successModal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function showError(message) {
    const modal = document.getElementById('errorModal');
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
    document.body.style.overflow = 'auto';
}

function resetForm() {
    const form = document.getElementById('notesForm');
    form.reset();
    removeFile();
    setDefaultDate();
}

// Gestion des erreurs globales
window.addEventListener('error', function(e) {
    console.error('Erreur JavaScript:', e.error);
    showError('Une erreur inattendue s\'est produite.');
});
