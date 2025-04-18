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

async function fixMockDataFormat() {
  try {
    console.log("Finding users with string-format club IDs...");

    // Get all users
    const allUsers = await User.find().lean();
    let fixedCount = 0;

    for (const user of allUsers) {
      // Skip users with no clubs
      if (!user.clubs || user.clubs.length === 0) continue;

      console.log(
        `\nChecking user: ${user.displayName || "No name"} (${user.email})`
      );

      // Check if any clubs are stored as strings instead of ObjectIds
      const hasStringClubs = user.clubs.some(
        (club) => typeof club === "string"
      );

      if (hasStringClubs) {
        console.log(`Found user with string club IDs: ${user.email}`);

        // Convert string club IDs to ObjectIds and verify they exist
        const validObjectIds = [];

        for (const club of user.clubs) {
          try {
            // If it's already an ObjectId, just use it
            if (typeof club === "object" && club.$oid) {
              const objectId = new mongoose.Types.ObjectId(club.$oid);
              const clubExists = await Club.exists({ _id: objectId });

              if (clubExists) {
                validObjectIds.push(objectId);
                console.log(`  ✓ Valid club ID (from $oid): ${club.$oid}`);
              } else {
                console.log(
                  `  ❌ Invalid club ID (from $oid): ${club.$oid} - Club does not exist`
                );
              }
            }
            // If it's a string (from mock data)
            else if (typeof club === "string") {
              const objectId = new mongoose.Types.ObjectId(club);
              const clubExists = await Club.exists({ _id: objectId });

              if (clubExists) {
                validObjectIds.push(objectId);
                console.log(`  ✓ Valid club ID (from string): ${club}`);
              } else {
                console.log(
                  `  ❌ Invalid club ID (from string): ${club} - Club does not exist`
                );

                // Create the missing club
                await createMissingClub(club);
                validObjectIds.push(objectId);
              }
            }
            // If it's already an ObjectId
            else if (
              club instanceof mongoose.Types.ObjectId ||
              (club._id && typeof club._id !== "string")
            ) {
              const clubExists = await Club.exists({ _id: club });

              if (clubExists) {
                validObjectIds.push(club);
                console.log(`  ✓ Valid club ID (from ObjectId): ${club}`);
              } else {
                console.log(
                  `  ❌ Invalid club ID (from ObjectId): ${club} - Club does not exist`
                );
              }
            }
          } catch (err) {
            console.log(
              `  ❌ Error processing club ID: ${club} - ${err.message}`
            );
          }
        }

        // Update the user with converted ObjectIds
        if (validObjectIds.length > 0) {
          console.log(
            `Updating user with ${validObjectIds.length} valid ObjectId club references...`
          );
          await User.findByIdAndUpdate(user._id, { clubs: validObjectIds });
          console.log(`User updated successfully`);
          fixedCount++;
        }
      } else {
        console.log(
          `User has proper ObjectId club references, no fixing needed.`
        );
      }
    }

    console.log(`\nFixed ${fixedCount} users with string club IDs`);
  } catch (error) {
    console.error("Error fixing mock data format:", error);
  }
}

async function createMissingClub(clubId: string) {
  try {
    const existingClub = await Club.findById(clubId);

    if (existingClub) {
      console.log(
        `Club with ID ${clubId} already exists: ${existingClub.name}`
      );
      return existingClub;
    }

    const clubName = `Auto-created Club (${clubId.substring(0, 6)}...)`;

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
      description: `This club was automatically created to fix mock data references`,
    });

    await newClub.save();
    console.log(`Created missing club: ${clubName} with ID ${clubId}`);
    return newClub;
  } catch (error) {
    console.error(`Error creating missing club ${clubId}:`, error);
    return null;
  }
}

async function main() {
  await connectToDatabase();

  console.log("\n--- FIXING MOCK DATA FORMAT ---");
  await fixMockDataFormat();

  console.log("\nFixes completed");
  mongoose.connection.close();
}

main().catch((error) => {
  console.error("Script error:", error);
  mongoose.connection.close();
  process.exit(1);
});
