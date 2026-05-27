const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Parent = require('../models/Parent');

const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request
    if (decoded.type === 'student') {
      const student = await Student.findById(decoded.id).select('-pin_hash');
      if (!student) return res.status(401).json({ error: 'User not found' });
      req.user = student;
      req.userType = 'student';
    } else if (decoded.type === 'parent') {
      const parent = await Parent.findById(decoded.id).select('-pin_hash');
      if (!parent) return res.status(401).json({ error: 'User not found' });
      req.user = parent;
      req.userType = 'parent';
    } else {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Require specific user type
const requireStudent = (req, res, next) => {
  if (req.userType !== 'student') {
    return res.status(403).json({ error: 'Student access required' });
  }
  next();
};

const requireParent = (req, res, next) => {
  if (req.userType !== 'parent') {
    return res.status(403).json({ error: 'Parent access required' });
  }
  next();
};

module.exports = { auth, requireStudent, requireParent };
