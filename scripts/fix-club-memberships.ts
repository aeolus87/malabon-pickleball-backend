// backend/scripts/fix-club-memberships.ts
import mongoose from "mongoose";
import { Club } from "../src/models/club.model";
import { User } from "../src/models/user.model";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function connectToDatabase() {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error("MONGODB_URI environment variable is not defined");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

async function fixClubMemberships() {
  try {
    console.log("Fixing club memberships in the database...");

    // 1. Find all users with club references
    const usersWithClubs = await User.find({
      clubs: { $exists: true, $ne: [] },
    }).lean();
    console.log(`Found ${usersWithClubs.length} users with club references`);

    // 2. Check each user's club references and fix if needed
    for (const user of usersWithClubs) {
      console.log(
        `\nProcessing user: ${user.displayName || "No name"} (${user.email})`
      );
      console.log(`Club references before: ${user.clubs.length}`);

      const validClubIds = [];
      const invalidClubIds = [];

      // Check each club reference
      for (const clubId of user.clubs) {
        const clubIdStr = clubId.toString();

        try {
          // Convert string ID to ObjectId if needed
          let objectIdToCheck = clubId;
          if (typeof clubId === "string") {
            objectIdToCheck = new mongoose.Types.ObjectId(clubId);
          }

          // Check if club exists
          const clubExists = await Club.exists({ _id: objectIdToCheck });

          if (clubExists) {
            validClubIds.push(objectIdToCheck);
            const club = await Club.findById(objectIdToCheck).lean();
            console.log(`  ✓ Valid club: ${club.name} (${clubIdStr})`);
          } else {
            invalidClubIds.push(clubIdStr);
            console.log(`  ❌ Invalid club ID: ${clubIdStr}`);
          }
        } catch (err) {
          invalidClubIds.push(clubIdStr);
          console.log(`  ❌ Error with club ID: ${clubIdStr} - ${err.message}`);
        }
      }

      // Update user with only valid club IDs if there are invalid ones
      if (invalidClubIds.length > 0) {
        console.log(
          `Updating user with only valid club IDs (removing ${invalidClubIds.length} invalid references)...`
        );
        await User.findByIdAndUpdate(user._id, { clubs: validClubIds });
        console.log(`User updated successfully`);
      } else {
        console.log(`No invalid club references found for this user`);
      }
    }

    // 3. Summary of all clubs and their counts
    const clubs = await Club.find().lean();
    console.log(`\n=== CLUB MEMBERSHIP SUMMARY ===`);
    console.log(`Total clubs: ${clubs.length}`);

    for (const club of clubs) {
      const memberCount = await User.countDocuments({ clubs: club._id });
      console.log(`${club.name}: ${memberCount} members`);
    }
  } catch (error) {
    console.error("Error fixing club memberships:", error);
  }
}

async function addMissingClub(clubId: string, clubName: string) {
  try {
    const existingClub = await Club.findById(clubId);

    if (existingClub) {
      console.log(
        `Club with ID ${clubId} already exists: ${existingClub.name}`
      );
      return existingClub;
    }

    // Create the club with the specific ID
    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(clubId);
    } catch (err) {
      console.error(`Invalid ObjectId format: ${clubId}`);
      return null;
    }

    const newClub = new Club({
      _id: objectId,
      name: clubName,
      description: `${clubName} - Auto-created club`,
    });

    await newClub.save();
    console.log(`Created missing club: ${clubName} with ID ${clubId}`);
    return newClub;
  } catch (error) {
    console.error(`Error adding missing club ${clubId}:`, error);
    return null;
  }
}

async function main() {
  await connectToDatabase();

  // First, check if there are any clubs that need to be created
  // - You can customize this section with the specific club IDs from your mock data
  console.log("\n--- CHECKING FOR MISSING CLUBS ---");
  // Example: Check a specific club ID from your mock data
  const mockClubId = "67f505f891ed047845eaf3d8"; // Replace with your actual club ID
  await addMissingClub(mockClubId, "Mock Club"); // Replace with your desired club name

  // Now fix club memberships
  console.log("\n--- FIXING CLUB MEMBERSHIPS ---");
  await fixClubMemberships();

  console.log("\nFixes completed");
  mongoose.connection.close();
}

main().catch((error) => {
  console.error("Script error:", error);
  mongoose.connection.close();
  process.exit(1);
});
