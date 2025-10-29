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

  const TEST_DATE = new Date('2025-10-28T02:38:11');
  const EXPECTED_BACKUP_FOLDER = 'backup_10282025_023811';
  
  let mockCollections;
  let originalDate;

  beforeEach(() => {
    jest.clearAllMocks();
    originalDate = global.Date;
    global.Date = class extends Date {
      constructor() {
        super();
        return TEST_DATE;
      }
    };
    
    // Mock console.log for error handling tests
    jest.spyOn(console, 'log').mockImplementation(() => {});

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

  afterEach(() => {
    global.Date = originalDate;
  });

  describe('saveBackup', () => {
    it('should create backup directory with correct timestamp format', async () => {
      // Act
      const backupDir = await saveBackup(baseDir);

      // Assert
      expect(path.basename(backupDir)).toBe(EXPECTED_BACKUP_FOLDER);
      expect(fs.ensureDir).toHaveBeenCalledWith(backupDir);
    });

    it('should write JSON files for each collection with correct data', async () => {
      // Act
      const backupDir = await saveBackup(baseDir);

      // Assert
      expect(fs.writeJson).toHaveBeenCalledTimes(fakeCollections.length);
      fakeCollections.forEach((collection, index) => {
        const expectedData = collection.name === 'patients'
          ? [{ _id: '1', name: 'John Doe', age: 25 }]
          : [{ _id: 'A1', patientId: '1', date: '2025-10-28' }];

        expect(fs.writeJson).toHaveBeenNthCalledWith(
          index + 1,
          path.join(backupDir, `${collection.name}.json`),
          expectedData,
          expect.any(Object)
        );
      });
    });

    it('should handle filesystem errors', async () => {
      // Arrange
      fs.ensureDir.mockRejectedValueOnce(new Error('Access denied'));
      
      // Act & Assert
      await expect(saveBackup(baseDir)).rejects.toThrow();
    });

    it('should handle filesystem errors properly', async () => {
      // Arrange
      const fsError = new Error('Disk full');
      fs.ensureDir.mockRejectedValueOnce(fsError);

      // Act & Assert
      await expect(saveBackup(baseDir)).rejects.toThrow('Disk full');
    });
  });

  describe('loadBackup', () => {
    describe('Error Handling', () => {
      it('should handle missing backup directory', async () => {
        // Arrange
        fs.readdir.mockRejectedValueOnce(new Error('No directory found.'));

        // implementation doesnt throw or catch error on missing directory
        try {
          // Act
          await loadBackup(baseDir);
        } catch (error) {
          // Assert
          expect(console.log).not.toHaveBeenCalled();
        }
        // Assert
        expect(console.log).not.toHaveBeenCalled();
      });

      it('should handle corrupted backup files', async () => {
        // Arrange
        fs.readJson.mockRejectedValueOnce(new Error('Invalid JSON'));

        // Act & Assert
        await expect(loadBackup(baseDir)).rejects.toThrow();
      });

      it('should handle empty backup directory', async () => {
        // Arrange
        fs.readdir.mockResolvedValueOnce([]);

        // Act
        await loadBackup(baseDir);

        // Assert
        expect(console.log).toHaveBeenCalledWith('No backups found.');
      });
    });

    describe('Data Restoration', () => {
      it('should update accordingly on new and changed documents', async () => {
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

      it('should only insert the discovered missing documents', async () => {
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

        // Act & Assert
        await loadBackup(baseDir);
        expect(mockCollections.patients.insertMany).toHaveBeenCalledWith([{ _id: '2', name: 'Jane Smith', age: 28 }]);
        expect(mockCollections.patients.deleteMany).not.toHaveBeenCalled();
        expect(mockCollections.patients.updateOne).not.toHaveBeenCalled();
        expect(mockCollections.appointments.insertMany).not.toHaveBeenCalled();
        expect(mockCollections.appointments.deleteMany).not.toHaveBeenCalled();
        expect(mockCollections.appointments.updateOne).not.toHaveBeenCalled();
      });

      it('should not insert, delete, or update on identical data', async () => {
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
        expect(mockCollections.appointments.deleteMany).not.toHaveBeenCalled();
        expect(mockCollections.appointments.updateOne).not.toHaveBeenCalled();
      });

    it('should handle empty collections in backup', async () => {
      // Arrange
      fs.readJson.mockResolvedValue([]);

        // Act
        await loadBackup(baseDir);

        // Assert
        expect(mockCollections.patients.deleteMany).toHaveBeenCalled();
        expect(mockCollections.patients.insertMany).not.toHaveBeenCalled();
        expect(mockCollections.patients.updateOne).not.toHaveBeenCalled();
      });

      it('should handle large datasets efficiently', async () => {
        // Arrange
        const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
          _id: `id${i}`,
          name: `Patient ${i}`,
          age: 20 + (i % 80)
        }));
        fs.readJson.mockResolvedValueOnce(largeDataset);

        // Act
        await loadBackup(baseDir);

        // Assert
        expect(mockCollections.patients.insertMany).toHaveBeenCalledWith(
          expect.arrayContaining([expect.objectContaining({ _id: 'id0' })])
        );
      });

      it('should properly handle document updates with nested objects', async () => {
        // Arrange
        const existingDoc = {
          _id: '1',
          name: 'John Doe',
          age: 25,
          address: {
            street: '123 Old St',
            city: 'Zaun'
          }
        };
        const backupDoc = {
          _id: '1',
          name: 'John Doe',
          age: 25,
          address: {
            street: '123 Main St',
            city: 'Zaun'
          }
        };
        
        mockCollections.patients.find = jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([existingDoc])
        });

        fs.readJson.mockImplementation(async (filePath) => {
          if (filePath.includes('patients.json')) return [backupDoc];
          return [];
        });

        // Act
        await loadBackup(baseDir);

        // Assert
        expect(mockCollections.patients.updateOne).toHaveBeenCalledWith(
          { _id: '1' },
          { $set: {
            name: 'John Doe',
            age: 25,
            address: {
              street: '123 Main St',
              city: 'Zaun'
            }
          }}
        );
      });
    });
  });

  describe('Integration', () => {
    it('should handle complete backup and restore cycle', async () => {
      // Act
      const backupDir = await saveBackup(baseDir);
      await loadBackup(baseDir);

      // Assert
      expect(fs.writeJson).toHaveBeenCalledWith(
        expect.stringContaining('patients.json'),
        expect.arrayContaining([expect.objectContaining({ name: 'John Doe' })]),
        expect.any(Object)
      );
      expect(mockCollections.patients.updateOne).toHaveBeenCalled();
    });
  });
});
