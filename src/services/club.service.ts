// src/services/club.service.ts
import { Club } from "../models/club.model";
import { User } from "../models/user.model"; // Add this import

export const clubService = {
  async getAllClubs() {
    return Club.find().lean();
  },

  async createClub(name: string, description: string, logo?: string) {
    const club = new Club({ name, description, logo });
    return club.save();
  },

  async addClubsToUser(userId: string, clubIds: string[]) {
    return User.findByIdAndUpdate(
      userId,
      { clubs: clubIds, isProfileComplete: true },
      { new: true }
    ).populate("clubs");
  },

  async addClubToUser(userId: string, clubId: string) {
    return User.findByIdAndUpdate(
      userId,
      { $addToSet: { clubs: clubId } },
      { new: true }
    ).populate("clubs");
  },

  async removeClubFromUser(userId: string, clubId: string) {
    return User.findByIdAndUpdate(
      userId,
      { $pull: { clubs: clubId } },
      { new: true }
    ).populate("clubs");
  },

  async getClubById(clubId: string) {
    return Club.findById(clubId).lean();
  },

  async getClubMembers(clubId: string) {
    const members = await User.find(
      { clubs: clubId },
      "displayName photoURL email"
    ).lean();
    return members;
  },

  async getClubWithMemberCount() {
    // Aggregate clubs with their member counts
    const clubsWithCounts = await Club.aggregate([
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
          description: 1,
          logo: 1,
          createdAt: 1,
          updatedAt: 1,
          memberCount: { $size: "$members" },
        },
      },
    ]);

    return clubsWithCounts;
  },
};
