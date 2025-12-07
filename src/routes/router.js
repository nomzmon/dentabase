// this file is essentially the api routes.

// will be most used libraries
const express = require('express');
const Router = require('express');
// other libraries to be added based on necessity / user stories.
// mongoose models, add based on user stories

const Patient = require('../models/patient');
const Treatment = require('../models/treatment');
const Service = require('../models/service.js');
const NonPatient = require('../models/nonpatient.js');

const sampleTreatments = require('../scripts/sampleData/treatmentData');

const router = Router();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

const app = express();
app.use(express.static('public'));

router.use("/", require('./auth'));
router.use("/", require('./backup'));
router.use("/", require('./ortho'));
router.use("/", require('./patient'));
router.use("/", require('./report'));
router.use("/", require('./services'));
router.use("/", require('./treatment'));
router.use("/", require('./upload'));

app.use(express.urlencoded({ extended: true }));

// SERVICE - Information
router.get("/to-do", async (req, res) => {

    const isAuthenticated = !!req.session.isAuthenticated;

    if (!req.session.isAuthenticated) {
        return res.redirect('/login'); //redirect to login if not authenticated
    }

    try {
        const services = await Service.find({});
        const page = parseInt(req.query.page) || 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0); //start of today
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + page); //adjust by page offset

        //start and end time of date, adjusting for timezone
        const startOfDay = new Date(targetDate);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        //fetch from patient model given isActive and the effective date
        const patients = await Patient.find({
            isActive: true,
            effectiveDate: { $gte: startOfDay, $lt: endOfDay },
        }).populate({
            path: "treatments",
            options: { sort: { date: -1 }, limit: 1 },
        });

        //fetch non-patients with appointments target date
        const nonPatients = await NonPatient.find({
            effectiveDate: { $gte: startOfDay, $lt: endOfDay },
        });

        const formattedPatients = patients.map(patient => {
            const latestTreatment = patient.treatments.length > 0 ? patient.treatments[0] : null;

            return {
                id: patient.id,
                firstName: patient.firstName,
                lastName: patient.lastName,
                contact: patient.contact || "N/A",
                email: patient.email || "N/A",
                formattedTime: patient.effectiveDate
                    ? `${patient.effectiveDate.getHours().toString().padStart(2, '0')}:${patient.effectiveDate.getMinutes().toString().padStart(2, '0')}`
                    : "N/A",
                latestProcedure: latestTreatment ? latestTreatment.procedure : req.query.services,
                isPatient: true
            };
        });
        //format non-patient data to match the structure of patient data
        const formattedNonPatients = nonPatients.map(nonPatient => ({
            id: nonPatient._id, // Must add id for remove to work
            firstName: nonPatient.name.split(' ')[0] || "N/A",
            lastName: nonPatient.name.split(' ').slice(1).join(' ') || "N/A",
            contact: nonPatient.contact || "N/A",
            email: nonPatient.email,
            formattedTime: nonPatient.startTime
                ? `${new Date(nonPatient.startTime).getHours().toString().padStart(2, '0')}:${new Date(nonPatient.startTime).getMinutes().toString().padStart(2, '0')}`
                : "N/A",
            latestProcedure: nonPatient.service, // service label
            isPatient: false
        }));

        //combine patients and non-patients
        const allAppointments = [...formattedPatients, ...formattedNonPatients];

        res.render("B_Todo", {
            patients: allAppointments,
            appointmentCount: allAppointments.length,
            dateDisplay: startOfDay.toDateString(),
            page, isAuthenticated, services
        });
    } catch (error) {
        console.error("Error fetching appointments:", error);
        res.status(500).send("Error retrieving appointment data.");
    }
});

router.post("/remove-effective-dates", async (req, res) => {
    try {
        const { patientIds } = req.body;

        if (!patientIds || patientIds.length === 0) {
            return res.status(400).send({ success: false, message: "No patients selected for deletion." });
        }

        const nonPatientIDs = patientIds.filter(id => isNaN(Number(id)))
        const patientIDs = patientIds.filter(id => !isNaN(Number(id)))
        const nonPatientResult = await NonPatient.deleteMany(
            { _id: { $in: nonPatientIDs } }
        );
        await Patient.updateMany(
            { id: { $in: patientIDs } },
            { $unset: { effectiveDate: "" } }
        );
        res.status(200).send({ success: true, message: "Patients successfully removed from the To-Do list." });
    } catch (error) {
        console.error("Error removing effectiveDates:", error);
        res.status(500).send({ success: false, message: "Failed to update patient data." });
    }
});

router.post('/update-effective-date', async (req, res) => {
    const { id, effectiveDate, startTime, endTime, service } = req.body;

    try {
        if (!id || !effectiveDate || !startTime || !endTime || !service) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const startDateTime = new Date(`${effectiveDate}T${startTime}`);
        const endDateTime = new Date(`${effectiveDate}T${endTime}`);

        const patient = await Patient.findOne({ id });
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        patient.effectiveDate = startDateTime;

        const newTreatment = new Treatment({
            id: new Date().getTime(),
            date: startDateTime,
            startTime: startDateTime,
            endTime: endDateTime,
            procedure: service,
            patientID: patient.id,
            status: 'ongoing',
        });

        await newTreatment.save();
        patient.treatments.push(newTreatment._id);
        await patient.save();

        res.status(200).json({ message: 'Added to To-Do', startTime: startDateTime, endTime: endDateTime });
    } catch (error) {
        console.error('Error updating effective date:', error);
        res.status(500).json({ message: 'Error updating effective date' });
    }
});

router.post('/non-patient-appointment', async (req, res) => {
    try {
        const { name, email, contact, effectiveDate, startTime, endTime, service } = req.body;

        if (!name || !email || !contact || !effectiveDate || !startTime || !endTime || !service) {
            return res.status(400).json({ message: 'All fields are required for a non-patient appointment.' });
        }

        const appointmentStart = new Date(`${effectiveDate}T${startTime}`);
        const appointmentEnd = new Date(`${effectiveDate}T${endTime}`);

        const nonPatientAppointment = new NonPatient({
            name,
            contact,
            email,
            effectiveDate: appointmentStart,
            startTime: appointmentStart,
            endTime: appointmentEnd,
            service
        });

        await nonPatientAppointment.save();

        return res.status(201).json({ message: 'One-time patient appointment created successfully.' });
    } catch (error) {
        console.error('Error creating one-time patient appointment:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

router.post("/appointments", async (req, res) => {
    try {
        const { patientID, date, startTime, endTime, procedure, dentist } = req.body;

        // combine start and end
        const appointmentDate = new Date(date);
        const startDateTime = new Date(appointmentDate.setHours(...startTime.split(':')));
        const endDateTime = new Date(appointmentDate.setHours(...endTime.split(':')));

        //call createAppointment function
        await createAppointment(patientID, startDateTime, endDateTime, procedure, dentist);

        res.status(201).json({ message: "Appointment created successfully" });
    } catch (error) {
        console.error("Error creating appointment:", error);
        res.status(500).json({ message: "Error creating appointment" });
    }
});

// --- DENTAL CHART SAVE ROUTE (FIXED) ---
router.post('/save-dental-chart', async (req, res) => {
    try {
        const patientID = req.body.patientID;

        // Check if data is valid before parsing
        if (!req.body.chartData || !req.body.examData) {
            return res.status(400).json({ message: "Missing chart data." });
        }

        const chartData = JSON.parse(req.body.chartData);
        const examData = JSON.parse(req.body.examData);

        console.log(`Saving Dental Chart for Patient ID: ${patientID}`);

        // Use findOneAndUpdate to bypass VersionError (__v)
        const updatedPatient = await Patient.findOneAndUpdate(
            { id: patientID }, // Find by your custom ID
            {
                $set: {
                    dentalChart: chartData,
                    dentalExam: examData
                }
            },
            { new: true, runValidators: false } // Return updated doc, skip strict validation if needed
        );

        if (!updatedPatient) {
            console.error("Patient not found with ID:", patientID);
            return res.status(404).json({ message: "Patient not found" });
        }

        res.status(200).json({ message: "Dental chart saved successfully!" });

    } catch (error) {
        console.error("Error saving dental chart:", error);
        res.status(500).json({ message: "Server error saving chart." });
    }
});

module.exports = router;