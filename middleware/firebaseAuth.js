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
  
      // For development - accept any token
      // In production, replace this with real Firebase Admin verification
      req.user = {
        email: 'test@example.com',
        uid: 'test-uid',
        name: 'Test User'
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