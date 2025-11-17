// src/services/user.service.ts
import { User } from "../models/user.model";
import { validateObjectId } from "../utils/validation";

// Standard population fields for user data
const USER_FIELDS = "_id email displayName photoURL coverPhoto bio isAdmin isSuperAdmin createdAt";

export interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  photoURL?: string;
  coverPhoto?: string;
}

export const userService = {
  async updateUserProfile(userId: string, updates: UpdateProfileData) {
    if (!validateObjectId(userId)) return null;
    
    // Filter out undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    return User.findByIdAndUpdate(userId, { $set: cleanUpdates }, { new: true })
      .select("-password");
  },

  async getUserProfile(userId: string) {
    if (!validateObjectId(userId)) return null;
    
    return User.findById(userId)
      .populate("clubs")
      .select("-password");
  },

  async checkUserExists(email: string) {
      const exists = await User.exists({ email });
      return !!exists;
  },

  async findUserByEmail(email: string) {
    return User.findOne({ email }).select("-password");
  },

  async findUserById(id: string) {
    if (!validateObjectId(id)) return null;
    
    return User.findById(id).select("-password");
  },

  async getAllUsers() {
    return User.find()
      .select(USER_FIELDS)
      .sort({ email: 1 });
  },

  async getAdminUsers() {
    return User.find({ isAdmin: true })
      .select(USER_FIELDS)
      .sort({ email: 1 });
  },

  async grantAdminPrivileges(userId: string) {
    if (!validateObjectId(userId)) return null;
    
    const user = await User.findById(userId);
    if (!user) return null;
    
    if (user.isAdmin) {
      return { error: "User already has admin privileges" };
    }

    user.isAdmin = true;
    await user.save();
    return user;
  },

  async revokeAdminPrivileges(userId: string) {
    if (!validateObjectId(userId)) return null;
    
    const user = await User.findById(userId);
    if (!user) return null;
    
    if (!user.isAdmin) {
      return { error: "User does not have admin privileges" };
    }

    if (user.isSuperAdmin) {
      return { error: "Cannot revoke admin privileges from a super admin" };
    }

    user.isAdmin = false;
    await user.save();
    return user;
  },

  async deleteUser(userId: string) {
    if (!validateObjectId(userId)) return null;
    
    return User.findByIdAndDelete(userId);
  },

  async createUser(userData: {
    email: string;
    displayName?: string;
    photoURL?: string;
    isAdmin?: boolean;
  }) {
      const newUser = new User({
        ...userData,
      });
      await newUser.save();
      return newUser.toObject();
  },
};
