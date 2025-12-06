const { saveBackup, loadBackup } = require('../scripts/backup.js');
const express = require('express');
const router = express.Router();
const path = require('path');
const Functions = require('../scripts/functions');

// Save Backup
router.post('/backup/save', Functions.isAuthenticated, async (req, res) => {
  try {
    const baseDir = path.resolve('./backup');
    const savedDir = await saveBackup(baseDir);
    res.status(200).json({ message: 'Backup saved successfully' });
  } catch (error) {
    console.error('Error saving backup:', error);
    res.status(500).json({ message: 'Failed to save backup' });
  }
});

// Load Backup
router.post('/backup/load', Functions.isAuthenticated, async (req, res) => {
  try {
    const baseDir = path.resolve('./backup');
    await loadBackup(baseDir);
    res.status(200).json({ message: 'Backup loaded successfully' });
  } catch (error) {
    console.error('Error loading backup:', error);
    res.status(500).json({ message: 'Failed to load backup' });
  }
});

module.exports = router;