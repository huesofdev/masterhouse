import { db } from "./src/db";
import { tripsTable } from "./src/features/operations/operations.schema";
import { tripRoutesTable } from "./src/features/operations/operations.schema";
import { v7 as uuidv7 } from "uuid";

async function seed() {
  try {
    // Get up to 3 trips
    const trips = await db.select({ id: tripsTable.id }).from(tripsTable).limit(3);
    if (trips.length === 0) {
      console.log("No trips found to attach routes to.");
      return;
    }

    const BATTICALOA_LAT = 7.7102;
    const BATTICALOA_LNG = 81.6924;

    const routesToInsert = [];

    for (let i = 0; i < trips.length; i++) {
      const tripId = trips[i].id;
      // Generate a path for this trip
      // Each trip gets a slightly different starting offset
      let currentLat = BATTICALOA_LAT + (i * 0.01);
      let currentLng = BATTICALOA_LNG + (i * 0.01);
      
      let currentTime = new Date();
      currentTime.setHours(currentTime.getHours() - 10); // Start 10 hours ago

      for (let j = 0; j < 20; j++) {
        // Move randomly slightly
        currentLat += (Math.random() - 0.5) * 0.005;
        currentLng += (Math.random() - 0.5) * 0.005;
        
        currentTime = new Date(currentTime.getTime() + 5 * 60000); // Add 5 minutes

        routesToInsert.push({
          id: uuidv7(),
          trip_id: tripId,
          gps_lat: currentLat.toString(),
          gps_lng: currentLng.toString(),
          timestamp: currentTime,
          created_at: new Date()
        });
      }
    }

    await db.insert(tripRoutesTable).values(routesToInsert);
    console.log(`Successfully seeded ${routesToInsert.length} route coordinates across ${trips.length} trips around Batticaloa.`);

    process.exit(0);
  } catch (err) {
    console.error("Failed:", err);
    process.exit(1);
  }
}

seed();
