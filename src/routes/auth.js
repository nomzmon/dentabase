const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

router.get('/login', (req, res) => {
  const isAuthenticated = !!req.session.isAuthenticated;
  if (req.session.isAuthenticated) {
    return res.redirect('/to-do');
  }
  res.render('A_LoginPage', { isAuthenticated });
});

router.post('/login', async (req, res) => {
  const { password } = req.body;

  try {
    const sharedHash = process.env.SHARED_PASSWORD_HASH;

    const isMatch = await bcrypt.compare(password, sharedHash);
    console.log(isMatch);
    if (isMatch) {
      req.session.isAuthenticated = true;
      res.redirect("/");
    } else {
      res.status(400).send('Invalid password');
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).send('An error occurred');

  }
});
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error during logout:', err);
      return res.status(500).send('Failed to log out.');
    }
    res.clearCookie('connect.sid'); // Clear session cookie
    res.redirect('/login'); // Redirect to login
  });
});

module.exports = router;