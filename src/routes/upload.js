const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Picture = require('../models/pictures');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../public/patientPic'));
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

// function copyFile(src){
//     let destDir = path.join(__dirname, '../../public/patientPic');
//     let fileName = path.basename(src);

//     let dest = path.join(destDir, fileName);

//     fs.copyFile(src, dest, (err) => {
//         if (err) {
//             console.error("Error copying file:", err);
//         } else {
//             console.log("File copied from ${src} to ${dest}");
//         }
//     });
// }

router.post('/upload-pic', upload.single('file'), (req, res) => {
  try {
    const fileName = req.file.originalname;
    const fileDate = req.body.date;
    const fileCaption = req.body.caption;
    const patientID = req.body.patientID;

    const picture = new Picture({
      fileName: fileName,
      date: fileDate,
      caption: fileCaption,
      patientID: patientID
    });


    picture.save().then(function () {
      if (req.file) {
        return res.json({ message: 'File uploaded successfully', file: req.file });
      } else {
        return res.status(400).json({ message: 'File upload failed.' });
      }
    });
  } catch (error) {
    console.error("Error uploading picture:", error);
    res.status(500).send("Server error");
  }
});

module.exports = router;