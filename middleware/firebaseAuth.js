// Simplified auth middleware for development
export const verifyFirebaseToken = async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ 
          success: false, 
          message: 'No token provided' 
        });
      }
  
      // For development - accept any token and create mock user
      // In production, replace with: await admin.auth().verifyIdToken(token);
      req.user = {
        email: 'test@example.com',
        uid: 'test-uid-123',
        name: 'Test User',
        picture: ''
      };
      
      next();
    } catch (error) {
      console.error('Auth error:', error);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
  };