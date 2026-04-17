const { getAdminApp } = require('../firebaseAdmin');

async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Missing Authorization Bearer token',
      });
    }

    const admin = getAdminApp();
    const decoded = await admin.auth().verifyIdToken(token);

    const adminUsersSnap = await admin
      .firestore()
      .collection('adminUsers')
      .where('uid', '==', decoded.uid)
      .limit(1)
      .get();

    if (adminUsersSnap.empty) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized (admin only)',
      });
    }

    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({
      success: false,
      message: 'Invalid auth token',
      error: e?.message,
    });
  }
}

module.exports = { requireAdmin };
