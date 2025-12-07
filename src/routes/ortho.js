const express = require('express');
const router = express.Router();

const Ortho = require('../models/orthodontics.js');
const Functions = require('../scripts/functions.js');

router.post('/deactivate-ortho', async function(req, res){
    try{
        let orthos = req.body.orthos;

        await Promise.all(orthos.map(ortho => {
            let firstPart;
            let secondPart;
            const spaceIndex = ortho.indexOf(' ');

            if (spaceIndex === -1) {
               firstPart = ortho;
            }
            firstPart = ortho.substring(0, spaceIndex);
            secondPart = ortho.substring(spaceIndex + 1);
            return Functions.setOrthoInactive(firstPart, secondPart);
        }));

        let count = await Ortho.countDocuments({isActive: true});

        return res.status(200).json({message: "Orthodontic patients successfully marked as finished.", count: count});

    } catch(error){
        console.error("Error deactivating orthodontics.", error);
        return res.status(500).json({message: "Error deactivating orthodontic patients", count: -1});
    }
});

module.exports = router;