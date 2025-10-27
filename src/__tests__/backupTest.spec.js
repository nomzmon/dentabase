const path = require('path');
const fs = require('fs-extra');
const mongoose = require('mongoose');
const { saveBackup, loadBackup } = require('../scripts/backup');

jest.mock('mongoose');
jest.mock('fs-extra');

describe('Backup Feature', () => {

  const baseDir = 'C:/temp/backups';
  const fakeCollections = [
    { name: 'patients' },
    { name: 'appointments' }
  ];

  let mockCollections;

  beforeEach(() => {
    jest.clearAllMocks();

    // Fake data
    const existingPatients = [{ _id: '1', name: 'John Doe', age: 25 }];
    const existingAppointments = [{ _id: 'A1', patientId: '1', date: '2025-10-28' }];

    // Default mock collections
    mockCollections = {
      patients: {
        find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(existingPatients) }),
        insertMany: jest.fn(),
        deleteMany: jest.fn(),
        updateOne: jest.fn()
      },
      appointments: {
        find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(existingAppointments) }),
        insertMany: jest.fn(),
        deleteMany: jest.fn(),
        updateOne: jest.fn()
      }
    };

    mongoose.connection = {
      db: {
        listCollections: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue(fakeCollections)
        }),
        collection: jest.fn().mockImplementation(name => mockCollections[name])
      }
    };

    fs.ensureDir.mockResolvedValue();
    fs.writeJson.mockResolvedValue();

    fs.readdir.mockImplementation(async (dir, options) => {
      if (dir === baseDir) {
        return [{ isDirectory: () => true, name: 'backup_10282025_023811' }];
      } else {
        return ['patients.json', 'appointments.json'];
      }
    });
  });

  // ---------------------------------------------------------
  // Case 1: Save backup
  // ---------------------------------------------------------
  it('When saveBackup is called, it should write JSON files for each collection', async () => {
    // Arrange
    jest.spyOn(global.Date.prototype, 'getMonth').mockReturnValue(9);
    jest.spyOn(global.Date.prototype, 'getDate').mockReturnValue(28);
    jest.spyOn(global.Date.prototype, 'getFullYear').mockReturnValue(2025);
    jest.spyOn(global.Date.prototype, 'getHours').mockReturnValue(2);
    jest.spyOn(global.Date.prototype, 'getMinutes').mockReturnValue(38);
    jest.spyOn(global.Date.prototype, 'getSeconds').mockReturnValue(11);

    // Act
    const backupDir = await saveBackup(baseDir);

    // Assert
    expect(fs.ensureDir).toHaveBeenCalled();
    expect(fs.writeJson).toHaveBeenCalledTimes(fakeCollections.length);
    expect(path.normalize(backupDir)).toContain(path.normalize(baseDir));
  });

  // ---------------------------------------------------------
  // Case 2: Missing data → should insert missing documents
  // ---------------------------------------------------------
  it('When loadBackup finds a missing patient, it should insert only that document', async () => {
    // Arrange
    const backupPatients = [
      { _id: '1', name: 'John Doe', age: 25 }, // existing
      { _id: '2', name: 'Jane Smith', age: 28 } // missing
    ];
    const backupAppointments = [{ _id: 'A1', patientId: '1', date: '2025-10-28' }];

    fs.readJson.mockImplementation(async (filePath) => {
      if (filePath.includes('patients.json')) return backupPatients;
      if (filePath.includes('appointments.json')) return backupAppointments;
    });

    // Act
    await loadBackup(baseDir);

    // Assert
    expect(mockCollections.patients.insertMany).toHaveBeenCalledWith([{ _id: '2', name: 'Jane Smith', age: 28 }]);
    expect(mockCollections.appointments.insertMany).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------
  // Case 3: Same data → should not insert or delete
  // ---------------------------------------------------------
  it('When loadBackup finds identical data, it should not insert, delete, or update', async () => {
    // Arrange
    const backupPatients = [{ _id: '1', name: 'John Doe', age: 25 }];
    const backupAppointments = [{ _id: 'A1', patientId: '1', date: '2025-10-28' }];

    fs.readJson.mockImplementation(async (filePath) => {
      if (filePath.includes('patients.json')) return backupPatients;
      if (filePath.includes('appointments.json')) return backupAppointments;
    });

    // Act
    await loadBackup(baseDir);

    // Assert
    expect(mockCollections.patients.insertMany).not.toHaveBeenCalled();
    expect(mockCollections.patients.deleteMany).not.toHaveBeenCalled();
    expect(mockCollections.patients.updateOne).not.toHaveBeenCalled();
    expect(mockCollections.appointments.insertMany).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------
  // Case 4: Changed field value → should update document
  // ---------------------------------------------------------
  it('When loadBackup finds changed or new documents, it should update accordingly', async () => {
    // Arrange
    const backupPatients = [
      { _id: '1', name: 'John Doe', age: 26 }, // changed
    ];
    const backupAppointments = [{ _id: 'A1', patientId: '1', date: '2025-10-28' }];

    fs.readJson.mockImplementation(async (filePath) => {
      if (filePath.includes('patients.json')) return backupPatients;
      if (filePath.includes('appointments.json')) return backupAppointments;
    });

    // Act
    await loadBackup(baseDir);

    // Assert
    expect(mockCollections.patients.updateOne).toHaveBeenCalledWith(
      { _id: '1' },
      { $set: { name: 'John Doe', age: 26 } }
    );
    expect(mockCollections.patients.insertMany).not.toHaveBeenCalled();
    expect(mockCollections.patients.deleteMany).not.toHaveBeenCalled();
  });
});
