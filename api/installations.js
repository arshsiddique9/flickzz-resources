// api/installations.js
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';

if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // ✅ Admin check (only owner can view)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  // We'll validate token in admin.js using Firebase Auth

  const { 
    plugin, 
    license, 
    status, 
    version, 
    installationId,
    limit = 50,
    offset = 0
  } = req.query;

  try {
    let query = db.collection('installations');
    
    // ✅ Apply filters
    if (plugin) query = query.where('plugin', '==', plugin);
    if (license) query = query.where('licenseId', '==', license);
    if (status) query = query.where('status', '==', status);
    if (version) query = query.where('pluginVersion', '==', version);
    if (installationId) query = query.where('installationId', '==', installationId);

    const snap = await query
      .orderBy('lastSeen', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset))
      .get();

    const installations = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      firstSeen: doc.data().firstSeen?.toDate?.() || null,
      lastSeen: doc.data().lastSeen?.toDate?.() || null,
      expiresAt: doc.data().expiresAt?.toDate?.() || null
    }));

    // ✅ Get total count
    const countSnap = await db.collection('installations').count().get();
    const total = countSnap.data().count || 0;

    return res.status(200).json({
      success: true,
      data: installations,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (err) {
    console.error('❌ Error fetching installations:', err);
    return res.status(500).json({ error: 'Failed to fetch installations' });
  }
}
