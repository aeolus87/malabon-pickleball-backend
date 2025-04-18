// backend/scripts/test-club-counts.ts
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

async function checkClubCounts() {
  try {
    // 1. Get all clubs
    const clubs = await Club.find().lean();
    console.log(`Found ${clubs.length} clubs in database`);

    // 2. For each club, manually count users
    for (const club of clubs) {
      // Find users who have this club in their clubs array
      const clubIdStr = club._id.toString();
      const userCount = await User.countDocuments({ clubs: club._id });

      // List the users who are members of this club
      const users = await User.find(
        { clubs: club._id },
        "email displayName"
      ).lean();

      console.log(`\nClub: ${club.name} (ID: ${clubIdStr})`);
      console.log(`Member count: ${userCount}`);

      if (users.length > 0) {
        console.log("Members:");
        users.forEach((user, index) => {
          console.log(
            `  ${index + 1}. ${user.displayName || "No name"} (${user.email})`
          );
        });
      } else {
        console.log("No members found for this club");
      }

      // Test the aggregation pipeline directly
      const clubWithCount = await Club.aggregate([
        { $match: { _id: club._id } },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "clubs",
            as: "members",
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            memberCount: { $size: "$members" },
          },
        },
      ]);

      if (clubWithCount.length > 0) {
        console.log(
          `Aggregation pipeline count: ${clubWithCount[0].memberCount}`
        );

        // Check if counts match
        if (clubWithCount[0].memberCount !== userCount) {
          console.log(
            "⚠️ WARNING: Counts don't match! This indicates a problem."
          );
        }
      }
    }

    // 3. Check for users with clubs that don't exist
    const allUsers = await User.find({
      clubs: { $exists: true, $ne: [] },
    }).lean();
    console.log(`\nFound ${allUsers.length} users with club memberships`);

    for (const user of allUsers) {
      if (!user.clubs || user.clubs.length === 0) continue;

      console.log(`\nUser: ${user.displayName || "No name"} (${user.email})`);
      console.log(`Club references: ${user.clubs.length}`);

      for (const clubId of user.clubs) {
        const clubIdStr = clubId.toString();
        const clubExists = await Club.exists({ _id: clubId });

        console.log(
          `  - Club ID: ${clubIdStr} - ${clubExists ? "Valid ✓" : "Invalid ❌"}`
        );

        if (!clubExists) {
          console.log(
            "    ⚠️ This club reference is invalid! The club does not exist."
          );
        } else {
          const club = await Club.findById(clubId).lean();
          console.log(`    Club name: ${club?.name}`);
        }
      }
    }
  } catch (error) {
    console.error("Error checking club counts:", error);
  }
}

async function testAddUserToClub() {
  try {
    // 1. Get a sample user and club
    const user = await User.findOne().lean();
    const club = await Club.findOne().lean();

    if (!user || !club) {
      console.log("No user or club found for testing");
      return;
    }

    console.log(`\nTesting club membership assignment`);
    console.log(`User: ${user.displayName || "No name"} (${user.email})`);
    console.log(`Club: ${club.name} (${club._id})`);

    // 2. Check if user is already a member
    const isMember =
      user.clubs &&
      user.clubs.some((id) => id.toString() === club._id.toString());
    console.log(`Is already a member: ${isMember ? "Yes" : "No"}`);

    // 3. Add user to club if not already a member
    if (!isMember) {
      console.log("Adding user to club...");
      await User.findByIdAndUpdate(
        user._id,
        { $addToSet: { clubs: club._id } },
        { new: true }
      );
      console.log("User added to club");
    }

    // 4. Verify the count again
    const updatedCount = await User.countDocuments({ clubs: club._id });
    console.log(`Updated member count: ${updatedCount}`);

    // 5. Test aggregation after update
    const updatedClubWithCount = await Club.aggregate([
      { $match: { _id: club._id } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "clubs",
          as: "members",
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          memberCount: { $size: "$members" },
        },
      },
    ]);

    if (updatedClubWithCount.length > 0) {
      console.log(
        `Updated aggregation pipeline count: ${updatedClubWithCount[0].memberCount}`
      );
    }
  } catch (error) {
    console.error("Error testing club membership:", error);
  }
}

async function main() {
  await connectToDatabase();
  console.log("\n--- CHECKING CLUB COUNTS ---");
  await checkClubCounts();
  console.log("\n--- TESTING USER-CLUB ASSIGNMENT ---");
  await testAddUserToClub();
  console.log("\nTests completed");
  mongoose.connection.close();
}

main().catch((error) => {
  console.error("Script error:", error);
  mongoose.connection.close();
  process.exit(1);
});
