// api/heartbeat.js
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';

if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { plugin, installationId, pluginVersion, mcVersion } = req.body;

  if (!plugin || !installationId) {
    return res.status(400).json({ error: 'Missing plugin or installationId' });
  }

  try {
    const docId = `${plugin}_${installationId}`;
    const docRef = db.collection('installations').doc(docId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Installation not found' });
    }

    const data = docSnap.data();
    const now = new Date();
    const lastSeen = data.lastSeen?.toDate?.() || new Date(0);
    const minutesSinceLastSeen = (now - lastSeen) / (1000 * 60);
    const heartbeatWindow = data.heartbeatWindowMinutes || 60;

    const status = minutesSinceLastSeen <= heartbeatWindow ? 'ONLINE' : 'OFFLINE';

    await docRef.update({
      lastSeen: now,
      status,
      pluginVersion: pluginVersion || data.pluginVersion,
      mcVersion: mcVersion || data.mcVersion
    });

    return res.status(200).json({ success: true, status });

  } catch (err) {
    console.error('❌ Heartbeat error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
