// api/plugin-verify.js
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import crypto from 'crypto';

// Init Firebase Admin
if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

// ✅ Valid license keys (stored in Firestore or hardcoded)
// For now, we'll store in Firestore collection: 'licenses'
const VALID_LICENSES = [
  // These will be managed via admin panel
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { 
    plugin, 
    licenseId, 
    installationId, 
    pluginVersion, 
    mcVersion,
    heartbeat = true 
  } = req.body;

  // ✅ Validate required fields
  if (!plugin || !licenseId || !installationId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: plugin, licenseId, installationId' 
    });
  }

  try {
    // ✅ Check if license is valid
    const licenseDoc = await db.collection('licenses').doc(licenseId).get();
    if (!licenseDoc.exists) {
      return res.status(403).json({ 
        success: false, 
        error: 'Invalid license key' 
      });
    }

    const licenseData = licenseDoc.data();
    
    // Check if license is active
    if (licenseData.status !== 'ACTIVE') {
      return res.status(403).json({ 
        success: false, 
        error: 'License is not active' 
      });
    }

    // Check if license is expired
    if (licenseData.expiresAt && licenseData.expiresAt.toDate() < new Date()) {
      return res.status(403).json({ 
        success: false, 
        error: 'License has expired' 
      });
    }

    // ✅ Update or create installation record
    const docId = `${plugin}_${installationId}`;
    const installRef = db.collection('installations').doc(docId);
    const docSnap = await installRef.get();

    const now = new Date();
    const heartbeatWindow = licenseData.heartbeatWindowMinutes || 60;

    if (!docSnap.exists) {
      // ✅ First time installation
      await installRef.set({
        plugin,
        licenseId,
        installationId,
        pluginVersion: pluginVersion || 'unknown',
        mcVersion: mcVersion || 'unknown',
        firstSeen: now,
        lastSeen: now,
        status: 'ONLINE',
        verificationCount: 1,
        heartbeatWindowMinutes: heartbeatWindow
      });
    } else {
      // ✅ Update existing installation
      const data = docSnap.data();
      const lastSeen = data.lastSeen?.toDate() || new Date(0);
      const minutesSinceLastSeen = (now - lastSeen) / (1000 * 60);

      // Update status based on heartbeat window
      const status = minutesSinceLastSeen <= heartbeatWindow ? 'ONLINE' : 'OFFLINE';

      await installRef.update({
        pluginVersion: pluginVersion || data.pluginVersion,
        mcVersion: mcVersion || data.mcVersion,
        lastSeen: now,
        status: status,
        verificationCount: data.verificationCount + 1
      });
    }

    // ✅ Return success with license details
    return res.status(200).json({
      success: true,
      license: {
        id: licenseId,
        valid: true,
        features: licenseData.features || [],
        expiresAt: licenseData.expiresAt?.toDate?.() || null
      },
      installation: {
        id: installationId,
        status: 'ONLINE'
      }
    });

  } catch (err) {
    console.error('❌ License verification error:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}
