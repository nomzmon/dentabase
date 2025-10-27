const fs = require('fs-extra');
const path = require('path');
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

function getTimestamp() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `backup_${mm}${dd}${yyyy}_${hh}${min}${ss}`;
}

async function saveBackup(baseDir) {
  const timestamp = getTimestamp();
  const backupDir = path.join(baseDir, timestamp);
  await fs.ensureDir(backupDir);

  const collections = await mongoose.connection.db.listCollections().toArray();

  for (let coll of collections) {
    const data = await mongoose.connection.db.collection(coll.name).find().toArray();
    const filePath = path.join(backupDir, `${coll.name}.json`);
    await fs.writeJson(filePath, data, { spaces: 2 });
    console.log(`Saved collection '${coll.name}' to ${filePath}`);
  }

  console.log(`Backup completed: ${backupDir}`);
  return backupDir;
}

async function loadBackup(baseDir) {
  if (!baseDir) baseDir = path.resolve('./backup');

  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  const backupDirs = entries
    .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('backup_'))
    .map(dirent => dirent.name);

  if (backupDirs.length === 0) {
    console.log('No backups found.');
    return;
  }

  backupDirs.sort();
  const backupDir = path.join(baseDir, backupDirs[backupDirs.length - 1]);
  console.log(`Loading latest backup: ${backupDir}`);

  const files = await fs.readdir(backupDir);

  for (let file of files) {
    if (path.extname(file) !== '.json') continue;

    const collectionName = path.basename(file, '.json');
    const newData = await fs.readJson(path.join(backupDir, file));
    const collection = mongoose.connection.db.collection(collectionName);
    const existingData = await collection.find().toArray();

    const newIds = newData.map(doc => doc._id?.toString()).filter(Boolean);
    const existingIds = existingData.map(doc => doc._id?.toString()).filter(Boolean);

    // Detect inserts
    const toInsert = newData.filter(doc => !existingIds.includes(doc._id?.toString()));

    // Detect deletes
    const toDelete = existingData.filter(doc => !newIds.includes(doc._id?.toString()));

    // Detect updates
    const toUpdate = newData.filter(newDoc => {
      const match = existingData.find(e => e._id?.toString() === newDoc._id?.toString());
      return match && JSON.stringify(match) !== JSON.stringify(newDoc);
    });

    if (toInsert.length === 0 && toDelete.length === 0 && toUpdate.length === 0) {
      console.log(`Collection '${collectionName}' is already up-to-date`);
      continue;
    }

    if (toInsert.length > 0) await collection.insertMany(toInsert);
    
    if (toDelete.length > 0) {
      const deleteIds = toDelete.map(doc => doc._id);
      await collection.deleteMany({ _id: { $in: deleteIds } });
    }

    for (const doc of toUpdate) {
      const { _id, ...fields } = doc;
      const queryId = ObjectId.isValid(_id) ? new ObjectId(_id) : _id;
      await collection.updateOne({ _id: queryId }, { $set: fields });
    }


    console.log(
      `Updated '${collectionName}': inserted ${toInsert.length}, updated ${toUpdate.length}, deleted ${toDelete.length}`
    );
  }
}


module.exports = { saveBackup, loadBackup };
