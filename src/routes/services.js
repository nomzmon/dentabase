const express = require('express');
const router = express.Router();
const Service = require('../models/service');
const Patient = require('../models/patient');
const Functions = require('../scripts/functions');

router.get("/services", async (req, res) => {
  const isAuthenticated = !!req.session.isAuthenticated;
  try {
    let services = await Service.find();
    res.render("D_Services", {
      services: services,
      serviceCount: services.length, isAuthenticated
    });

  } catch (error) {
    console.error("Error loading services page.", error);
  }

});

router.get('/services/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const service = await Functions.readService(id);
    res.status(200).json(service);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

router.post('/services', async (req, res) => {
    const { serviceName, price, type } = req.body;

    try {
        const result = await Service.findOneAndUpdate(
            { service: serviceName },
            { $setOnInsert: { service: serviceName, price, type } },
            { upsert: true, new: true }
        );

        if (result.service === serviceName) {
            res.json(result);
        } else {
            res.status(400).json({ message: 'Service creation failed' });
        }
    } catch (error) {
        console.error('Error creating service:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/services/update-multiple', async (req, res) => {
  const { updates } = req.body;

  try {
    const results = await Functions.updateMultipleServices(updates);
    res.status(200).json({ message: 'Services updated successfully', results });
  } catch (error) {
    console.error('Error updating services:', error);
    res.status(500).json({ message: 'Failed to update services' });
  }
});

router.get('/api/unique-services', Functions.isAuthenticated, async (req, res) => {
  try {
    const services = await Service.distinct('service');
    res.json(services);
  } catch (error) {
    console.error("Error fetching unique services:", error);
    res.status(500).send('Error fetching unique services');
  }
});

router.get('/api/patients-by-service', Functions.isAuthenticated, async (req, res) => {
  try {
    const { service, sortOrder, statusSort } = req.query;

    let patients = await Patient.find().populate('treatments').exec();

    // filter patients by service if specified
    if (service && service !== 'All') {
      patients = patients.filter(patient => {
        if (patient.treatments.length > 0) {
          const latestTreatment = patient.treatments.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
          return latestTreatment.procedure === service;
        }
        return false;
      });
    }

    //filter patients by status
    if (statusSort) {
      const isActiveFilter = statusSort === 'true';
      patients = patients.filter(patient => patient.isActive === isActiveFilter);
    }

    // sort patients by name if specified
    if (sortOrder === 'A-Z') {
      patients.sort((a, b) => a.firstName.localeCompare(b.firstName));
    } else if (sortOrder === 'Z-A') {
      patients.sort((a, b) => b.firstName.localeCompare(a.firstName));
    }

    // format the patient data for response
    const formattedPatients = patients.map(patient => ({
      id: patient.id,
      name: `${patient.firstName} ${patient.lastName}`,
      phone: patient.contact || 'N/A',
      email: patient.email || 'N/A',
      address: patient.homeAddress || 'N/A',
      lastVisit: patient.treatments.length > 0
        ? new Date(Math.max(...patient.treatments.map(t => new Date(t.date)))).toISOString()
        : 'N/A',
      lastProcedure: patient.treatments.length > 0
        ? patient.treatments.sort((a, b) => new Date(b.date) - new Date(a.date))[0].procedure
        : 'N/A',
      isActive: patient.isActive,
    }));

    res.json({ message: "Patients fetched successfully", patients: formattedPatients });
  } catch (error) {
    console.error("Error fetching patients:", error);
    res.status(500).send('Error fetching patients');
  }
});

module.exports = router;