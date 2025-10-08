export const addMedicinesGivenToVisits = async (db) => {
  try {
    // Check if medicines_given column already exists
    const tableInfo = await db.getAllAsync("PRAGMA table_info(visits)");
    const hasMedicinesGiven = tableInfo.some(col => col.name === 'medicines_given');
    
    if (!hasMedicinesGiven) {
      // Add medicines_given column to visits table only if it doesn't exist
      await db.execAsync(
        `ALTER TABLE visits ADD COLUMN medicines_given TEXT`
      );
      console.log('Successfully added medicines_given column to visits table');
    } else {
      console.log('medicines_given column already exists in visits table');
    }
    return true;
  } catch (error) {
    console.error('Error in medicines_given column migration:', error);
    return false;
  }
};