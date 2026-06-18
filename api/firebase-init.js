// ============================================
// Firebase Admin SDK Initialization Helper
// Place this in a new file: /api/firebase-init.js
// ============================================

import { initializeApp, cert, getApps } from 'firebase-admin/app';

export function initFirebaseAdmin() {
  // Already initialized?
  if (getApps().length > 0) {
    console.log('✅ Firebase already initialized');
    return true;
  }

  const rawJson = process.env.SERVICE_ACCOUNT_JSON;
  
  if (!rawJson) {
    console.error('❌ SERVICE_ACCOUNT_JSON environment variable is missing');
    return false;
  }

  try {
    // ✅ FIX: Try to parse as-is first (most common case)
    let serviceAccount;
    
    try {
      // Attempt 1: Parse directly
      serviceAccount = JSON.parse(rawJson);
      console.log('✅ JSON parsed directly');
    } catch (firstErr) {
      // Attempt 2: Fix escaped newlines (\\n → \n)
      console.log('⚠️ Direct parse failed, trying with newline fix...');
      const fixedJson = rawJson.replace(/\\n/g, '\n');
      serviceAccount = JSON.parse(fixedJson);
      console.log('✅ JSON parsed with newline conversion');
    }

    // Validate essential fields
    if (!serviceAccount.private_key || !serviceAccount.client_email || !serviceAccount.project_id) {
      throw new Error('SERVICE_ACCOUNT_JSON missing required fields (private_key, client_email, project_id)');
    }

    // Initialize Firebase
    initializeApp({
      credential: cert(serviceAccount)
    });

    console.log(`✅ Firebase initialized for project: ${serviceAccount.project_id}`);
    return true;

  } catch (err) {
    console.error('❌ Firebase initialization failed:');
    console.error('   Error:', err.message);
    console.error('   Position of error (if JSON):', err.message.match(/position (\d+)/)?.[1]);
    console.error('');
    console.error('🔧 TROUBLESHOOTING:');
    console.error('   1. Go to Firebase Console → Project Settings → Service Accounts');
    console.error('   2. Click "Generate New Private Key"');
    console.error('   3. Copy the ENTIRE JSON content');
    console.error('   4. Go to Vercel → Settings → Environment Variables');
    console.error('   5. IMPORTANT: Paste the JSON directly (no extra formatting)');
    console.error('   6. The system will handle newlines automatically');
    console.error('   7. Redeploy');
    
    return false;
  }
}
