const express = require('express');
const router = express.Router();
const Patient = require('../models/patient');
const MedicalHistory = require('../models/medicalHistory');
const Picture = require('../models/pictures');
const Service = require('../models/service');
const Functions = require('../scripts/functions');

// CREATE-PATIENT
router.post('/create-patient', function (req, res) {
  try {
    Functions.createPatient(
      req.body.firstName,
      req.body.lastName,
      req.body.middleName,
      req.body.nickname,
      req.body.address,
      new Date(req.body.birthdate),
      req.body.age,
      req.body.sex,
      req.body.religion,
      req.body.nationality,
      req.body.email,
      req.body.homeNo,
      req.body.occupation,
      req.body.dentalInsurance,
      req.body.officeNo,
      req.body.faxNo,
      req.body.cellNo,
      req.body.birthdate ? new Date(req.body.birthdate) : null, //temporary for effectiveDate
      req.body.guardianName,
      req.body.guardianOccupation,
      req.body.referral,
      req.body.consultationReason,
      req.body.previousDentist,
      req.body.lastVisit ? new Date(req.body.lastVisit) : null,
      "random pic" //placeholder for not sure pic
    ).then(function (patientID) {
      console.log('Patient record created successfully with ID: ' + patientID);
      return res.status(200).json({ message: "Patient record created successfully.", patientID: patientID });
    });

  } catch (error) {
    console.error("Error creating patient record.", error);
    res.status(500).send("Server error");
  }
});

//PATIENT-INFORMATION
router.get("/patient-information/:id", async (req, res) => {
    try {
        const patient = await Patient.findOne({id: req.params.id}).populate('treatments'); //unique id after the thing
        const fullName = `${patient.firstName} ${patient.middleName} ${patient.lastName}`;

        let birthdate = patient.birthdate;
        const birthyear = birthdate.getFullYear();
        let birthmonth = birthdate.getMonth() + 1;

        if(birthmonth < 10){
            birthmonth = "0" + birthmonth;
        }

        let birthday = birthdate.getDate();

        if(birthday < 10){
            birthday = "0" + birthday;
        }


        birthdate = birthyear + '-' + birthmonth + '-' + birthday;

        let fullSex = patient.sex;

        if(fullSex == "M"){
            fullSex = "Male";
        } else {
            fullSex = "Female";
        }

        const medicalHistory = await MedicalHistory.findOne({patientID: req.params.id});

        if(medicalHistory){
            console.log('Medical history found.');
        } else {
            console.log('Medical history not found.');
        }

        const patientTreatments = patient.treatments;

        patientTreatments.forEach(treatment => {
            treatment.teethAffected = treatment.teethAffected.join(', ');
            treatment.dateString = Functions.convertToDate(treatment.date);
        })

        const pictures = await Picture.find({patientID: req.params.id});

        pictures.forEach(picture => {
            picture.dateString = Functions.convertToDate(picture.date);
        })

        const services = await Service.find();

        let hasPictures = true;

        if(pictures.length == 0){
            hasPictures = false;
        }

        let hasTreatments = true;

        if(patientTreatments.length == 0){
            hasTreatments = false;
        }


        res.render("C_PatientInformation", {
            hasPictures: hasPictures,
            hasTreatments: hasTreatments,


            id: patient.id,
            title: fullName.trim(),
            full_name: fullName,
            age: patient.age,
            sex: patient.sex,
            birthdate: birthdate,
            nickname: patient.nickname,
            fullSex: fullSex,
            home_address: patient.homeAddress,
            occupation: patient.occupation,
            religion: patient.religion,
            nationality: patient.nationality,
            dental_insurance: patient.dentalInsurance,
            previous_dentist: patient.lastDentist,
            lastDentalVisit: Functions.convertToDate(patient.lastDentalVisit),
            email: patient.email,
            home_number: patient.homeNo,
            mobile_number: patient.contact,
            office_number: patient.officeNo,
            fax_number: patient.faxNo,
            guardian_name: patient.guardianName,
            guardian_occupation: patient.guardianOccupation,
            minor_referral_question: patient.referralName,
            consultation: patient.consultationReason,
            footnote: patient.footnote,

            isActive: patient.isActive,


            //medicalHistory
            physician_name: medicalHistory ? medicalHistory.physicianName : "N/A",
            physicianOfficeAddress: medicalHistory ? medicalHistory.physicianOfficeAddress : "N/A",
            physicianSpecialty: medicalHistory ? medicalHistory.physicianSpecialty : "N/A",
            physicianOfficeNumber: medicalHistory ? medicalHistory.physicianOfficeNumber : "N/A",
            prescription: medicalHistory ? medicalHistory.prescription : "N/A",
            illnessOrSurgery: medicalHistory ? medicalHistory.illnessOrSurgery : "N/A",
            condition: medicalHistory ? medicalHistory.condition : "N/A",
            isUsingTobacco: medicalHistory ? medicalHistory.isUsingTobacco : "N/A",
            isAlcoholOrDrugs: medicalHistory ? medicalHistory.isAlcoholOrDrugs : "N/A",
            allergies: medicalHistory ? medicalHistory.allergies : "N/A",
            isPregnant: medicalHistory ? medicalHistory.isPregnant : "N/A",
            isNursing: medicalHistory ? medicalHistory.isNursing : "N/A",
            isBirthControlPills: medicalHistory ? medicalHistory.isBirthControlPills : "N/A",
            healthProblems: medicalHistory ? medicalHistory.healthProblems : "N/A",

            //dentalChart
            dentalChart: JSON.stringify(patient.dentalChart || []),
            dentalExam: JSON.stringify(patient.dentalExam || {}),

            //treatments
            treatments: patientTreatments,
            treatmentsSize: patientTreatments.length,

            //pictures
            pictures : pictures,

            //services
            services: services,

            //informed consent
            consentName: patient.consentName,
            consentDate: Functions.convertToDate(patient.consentDate)
        });
    } catch (error) {
        console.error("Error fetching patient information:", error);
        res.status(500).send("Server error");
    }
});

router.post("/update-patient", async function(req, resp){
try{
    let patientSex;
    if(req.body.sex == "Male"){
        patientSex = 'M';
    } else {
        patientSex = 'F';
    }

    console.log(patientSex);

    await Functions.updatePatientInfo(
            req.body.patientID,
            req.body.nickname,
            req.body.address,
            new Date(req.body.birthdate),
            req.body.age,
            patientSex,
            req.body.religion,
            req.body.nationality,
            req.body.email,
            req.body.homeNo,
            req.body.occupation,
            req.body.dentalInsurance,
            req.body.officeNo,
            req.body.faxNo,
            req.body.mobileNo,
            req.body.guardianName,
            req.body.guardianOccupation,
            req.body.referral,
            req.body.consultationReason,
            req.body.lastDentist,
            req.body.lastDentalVisit ? new Date(req.body.lastDentalVisit) : null,
        );
        resp.status(200).send('Patient information updated successfully');
} catch(error){
    console.error("Error updating patient info.", error);
}

});

router.get('/patient/:id', Functions.isAuthenticated, async (req, res) => {

    try {
        const patientId = req.params.id;
        const id = Number(patientId);

        const patient = await Patient.findOne({ id }).populate('treatments').exec();

        if (!patient) {
            return res.status(404).send("Patient not found");
        }

        const formattedPatient = {
            name: `${patient.firstName} ${patient.lastName}`,
            phone: patient.contact || 'N/A',
            email: patient.email || 'N/A',
            address: patient.homeAddress || 'N/A',
            treatments: patient.treatments.map(treatment => ({
                procedure: treatment.procedure,
                date: new Date(treatment.date).toISOString()
            })),
            isActive: patient.isActive,
        };

        res.json({ message: "Patient information fetched successfully", patient: formattedPatient });
    } catch (error) {
        console.error("Error fetching patient information:", error);
        res.status(500).send('Error fetching patient information');
    }
});

router.get("/patient_list", async (req, res) => {
    const isAuthenticated = !!req.session.isAuthenticated;
    try {
        const searchQuery = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const services = await Service.find();

        // Query to find patients
        const patients = await Patient.find({
            isActive: true,
            $or: [
                { firstName: { $regex: searchQuery, $options: 'i' } },
                { lastName: { $regex: searchQuery, $options: 'i' } },
                { middleName: { $regex: searchQuery, $options: 'i' } },
                { nickname: { $regex: searchQuery, $options: 'i' } }
            ]
        })
            .skip(skip)
            .limit(limit);

        const totalPatients = await Patient.countDocuments({
            isActive: true,
            $or: [
                { firstName: { $regex: searchQuery, $options: 'i' } },
                { lastName: { $regex: searchQuery, $options: 'i' } },
                { middleName: { $regex: searchQuery, $options: 'i' } },
                { nickname: { $regex: searchQuery, $options: 'i' } }
            ]
        });

        const updatedPatients = await Promise.all(patients.map(async (patient) => {
            const populatedPatient = await patient.populate({
                path: "treatments",
                options: { sort: { date: -1 }, limit: 1 }
            });

            if (populatedPatient.treatments.length > 0) {
                const latestTreatment = populatedPatient.treatments[0];
                const latestDate = Functions.convertToDate(latestTreatment.date);
                const latestProcedure = latestTreatment.procedure;

                populatedPatient.latestTreatmentDate = latestDate;
                populatedPatient.latestProcedure = latestProcedure;
            } else {
                populatedPatient.latestTreatmentDate = "N/A";
                populatedPatient.latestProcedure = "N/A";
            }

            return populatedPatient;
        }));

        const totalPages = Math.ceil(totalPatients / limit);

        res.render("C_PatientList", {
            patients: updatedPatients,
            patientCount: totalPatients,
            currentPage: page,
            totalPages: totalPages,

            services: services,
            isAuthenticated
        });
    } catch (error) {
        console.log("Error getting data", error);
        res.status(500).end("Error retrieving patient data");
    }
});

router.get("/deactivate-patient", (req, res) => {
    try{
        Functions.deactivatePatient(req.body.patientID).then(function(){
            return res.status(200).json({message: "Patient deactivated successfully."});
        });
    } catch (error) {
        console.error("Error deactivating patient.", error);
        return res.status(400).json({message: 'Error deactivating patient.'});
    }
});

router.post('/deactivate-patient', async (req, res) => {
  try {
    const isActive = await Functions.deactivatePatient(req.body.patientID);
    res.status(200).json({ state: isActive });
  } catch (error) {
    res.status(400).json({ state: null });
  }
});

router.post("/update-medical-history", async function(req, res){
    try{

        await Functions.updateMedicalHistory(
            req.body.patientID,
            req.body.physicianName,
            req.body.physicianOfficeAddress,
            req.body.physicianSpecialty,

            req.body.physicianOfficeNumber,

            req.body.prescription,
            req.body.illnessOrSurgery,
            req.body.medicalTreatment,
            req.body.isTobacco,
            req.body.isAlcohol,
            req.body.allergies,

            req.body.isPregnant,
            req.body.isNursing,
            req.body.isBirthControl,

            req.body.healthProblems
        )

        res.status(200).send('Updating medical history successful');
    } catch(error){
        console.error("Error updating medical history. ", error);
        res.status(500).send('Error updating medical history');
    }
});

router.post("/fill-consent", async(req, res) => {
    try{
        const patient = await Patient.findOne({id: req.body.patientID});

        patient.consentName = req.body.consentName;
        patient.consentDate = new Date(req.body.consentDate);

        await patient.save();

        res.status(200).json({message: "Consent form filled successfully."});
    } catch(error){
        res.status(400).json({message: "Error filling up consent form."});
    }
});

router.post('/edit-footnote', async function(req, res){
    try{
        let patient = await Patient.findOne({id: req.body.patientID});

        patient.footnote = req.body.footnote;

        await patient.save();

        res.status(200).json({state: true, message: "Successfully updated footnote."});
    } catch(error){
        res.status(400).json({state: false, message: "Error editing footnote."});
    }
});

module.exports = router;