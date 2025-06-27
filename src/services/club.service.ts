// src/services/club.service.ts
import { Club } from "../models/club.model";
import { User } from "../models/user.model";
import { validateObjectId, validateObjectIds } from "../utils/validation";

// Standard population fields for consistency
const CLUB_FIELDS = "_id name description logo createdAt updatedAt";
const USER_FIELDS = "_id displayName photoURL email";

export const clubService = {
  async getAllClubs() {
    return Club.find().select(CLUB_FIELDS).lean();
  },

  async createClub(name: string, description: string, logo?: string) {
    const club = new Club({ name, description, logo });
    return club.save();
  },

  async addClubsToUser(userId: string, clubIds: string[]) {
    if (!validateObjectId(userId) || !clubIds.every(id => validateObjectId(id))) {
      return null;
    }

    return User.findByIdAndUpdate(
      userId,
      { clubs: clubIds, isProfileComplete: true },
      { new: true }
    ).populate("clubs");
  },

  async addClubToUser(userId: string, clubId: string) {
    if (!validateObjectIds(userId, clubId)) return null;

    return User.findByIdAndUpdate(
      userId,
      { $addToSet: { clubs: clubId } },
      { new: true }
    ).populate("clubs");
  },

  async removeClubFromUser(userId: string, clubId: string) {
    if (!validateObjectIds(userId, clubId)) return null;

    return User.findByIdAndUpdate(
      userId,
      { $pull: { clubs: clubId } },
      { new: true }
    ).populate("clubs");
  },

  async getClubById(clubId: string) {
    if (!validateObjectId(clubId)) return null;
    
    return Club.findById(clubId).select(CLUB_FIELDS).lean();
  },

  async getClubMembers(clubId: string) {
    if (!validateObjectId(clubId)) return null;
    
    return User.find({ clubs: clubId })
      .select(USER_FIELDS)
      .lean();
  },

  async getClubWithMemberCount() {
    return Club.aggregate([
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
  },

  async getUserClubsWithDetails(userId: string) {
    if (!validateObjectId(userId)) return [];
    
    const user = await User.findById(userId).populate('clubs').lean();
    
    if (!user?.clubs) return [];

    // Get member counts for each club in parallel
    const clubsWithCounts = await Promise.all(
      user.clubs.map(async (club: any) => {
        const memberCount = await User.countDocuments({ clubs: club._id });
        return { ...club, memberCount };
      })
    );

    return clubsWithCounts;
  },

  async getClubWithMembers(clubId: string) {
    if (!validateObjectId(clubId)) return null;
    
    const [club, members] = await Promise.all([
      Club.findById(clubId).select(CLUB_FIELDS).lean(),
      User.find({ clubs: clubId }).select(USER_FIELDS).lean()
    ]);
    
    if (!club) return null;

    return {
      club,
      members: members.map(member => ({
        _id: member._id,
        displayName: member.displayName,
        photoURL: member.photoURL,
        email: member.email
      }))
    };
  },
};
