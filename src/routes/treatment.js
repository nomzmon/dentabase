const express = require('express');
const Functions = require('../scripts/functions');
const Treatment = require('../models/treatment');

const router = express.Router();

router.post('/create-treatment', function (req, res) {
  try {
    let patientID = req.body.patientID;
    let procedureDate = req.body.procedureDate;
    let procedureName = req.body.procedureName;
    let dentistName = req.body.dentistName;
    let amountCharged = req.body.amountCharged;
    let amountPaid = req.body.amountPaid;
    let teethAffected = req.body.teethAffected;

    Functions.createTreatment(
      patientID,
      procedureDate,
      teethAffected,
      procedureName,
      dentistName,
      amountCharged,
      amountPaid,
      5000, //change balance
      'ongoing'
    ).then(function (treatmentID) {
      console.log("Treatment ID: " + treatmentID);
      console.log('Treatment record created successfully.');
      return res.status(200).send({ id: treatmentID });
    })
  } catch (error) {
    console.error("Error creating treatment record.", error);
    res.status(500).send("Server error");
  }
});

router.post("/update-treatments", async (req, res) => {
  try {
    const promises = req.body.treatments.map(async (instance) => {
      const treatment = await Treatment.findOne({ id: instance.id });

      treatment.date = instance.date;
      treatment.teethAffected = instance.teethAffected;
      treatment.procedure = instance.procedure;
      treatment.amountCharged = instance.amountCharged;
      treatment.amountPaid = instance.amountPaid;


      await treatment.save();
    });

    await Promise.all(promises);

    res.status(200).json({ message: "Treatments updated successfully." });
  } catch (error) {
    res.status(400).json({ message: "Error updating treatment." });
  }
});

module.exports = router;