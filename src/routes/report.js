const express = require('express');
const router = express.Router();
const Patient = require('../models/patient');
const Treatment = require('../models/treatment');
const Service = require('../models/service');
const NonPatient = require('../models/nonpatient.js');

router.get("/report", (req, res) => {
  const isAuthenticated = !!req.session.isAuthenticated;
  res.render("E_Report", { isAuthenticated });
});

router.get("/report", async (req, res) => {
  try {
    let allServices = await Service.find()
    let allAppointmentsData = await Treatment.find()
    let allWalkIns = await NonPatient.find()

    // Combine dates from both appointments and walk-ins
    const allDates = [
      ...allAppointmentsData.map(appt => appt.date),
      ...allWalkIns.map(walkIn => walkIn.effectiveDate)
    ];

    const availableYears = [...new Set(allDates
      .filter(d => d)
      .map(d => new Date(d).getFullYear())
    )];

    availableYears.sort((a, b) => b - a);

    const months = [
      { value: 0, month: 'Jan' },
      { value: 1, month: 'Feb' },
      { value: 2, month: 'Mar' },
      { value: 3, month: 'Apr' },
      { value: 4, month: 'May' },
      { value: 5, month: 'Jun' },
      { value: 6, month: 'Jul' },
      { value: 7, month: 'Aug' },
      { value: 8, month: 'Sep' },
      { value: 9, month: 'Oct' },
      { value: 10, month: 'Nov' },
      { value: 11, month: 'Dec' }
    ]
    res.render("E_Report", {
      // Send all appointments
      allAppointmentsData: allAppointmentsData,
      // Non-patients
      allWalkIns: allWalkIns,
      // For Filter
      allServices: allServices,
      availableYears: availableYears,
      months: months,
    });


  } catch (error) {
    console.error("Error loading report page.", error);
  }
});

router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0; // Default to page 0 if no page is provided
    console.log("Page parameter received:", page);

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of the current day

    // Calculate target date by adding/subtracting days based on the page number
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + page); // Offset by the page number
    console.log("Target date for page:", targetDate);

    // Fetch patients for the specific target date
    const patients = await Patient.find({
      isActive: true,
      effectiveDate: {
        $gte: targetDate,
        $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000) // End of the day
      }
    }).populate({
      path: "treatments",
      select: "procedure"
    });

    console.log("Number of patients found for target date:", patients.length);

    // Format times for display
    patients.forEach(patient => {
      if (patient.effectiveDate) {
        const date = new Date(patient.effectiveDate);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        patient.formattedTime = `${hours}:${minutes}`;
      } else {
        patient.formattedTime = "N/A";
      }
    });

    // Render the page with the filtered patients and target date
    res.render("B_Todo", {
      patients,
      appointmentCount: patients.length,
      dateDisplay: targetDate.toDateString(), // Displayed date
      page // Pass the current page number
    });
  } catch (error) {
    console.log("Error getting data:", error);
    res.status(500).end("Error retrieving patient data");
  }
});

module.exports = router;