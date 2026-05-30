function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      message: 'No autenticado'
    });
  }

  req.user = req.session.user;
  next();
}

module.exports = requireAuth;