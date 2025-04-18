import { Server as SocketIOServer } from "socket.io";
import { IVenue } from "../models/venue.model";

let io: SocketIOServer;

export const initSocketService = (socketIo: SocketIOServer) => {
  io = socketIo;
};

export const socketService = {
  // Emit to all clients when a venue is created or updated
  emitVenueUpdate: (venue: IVenue) => {
    if (!io) return;

    const venueData = {
      ...venue.toObject(),
      id: venue._id,
    };

    io.emit("venue:update", venueData);
  },

  // Emit to all clients when a venue is deleted
  emitVenueDelete: (venueId: string) => {
    if (!io) return;
    io.emit("venue:delete", venueId);
  },

  // Emit updated attendees list to everyone in a specific venue room
  emitVenueAttendeesUpdate: (venueId: string, attendees: any[]) => {
    if (!io) return;
    io.to(`venue:${venueId}`).emit("venue:attendees:update", {
      venueId,
      attendees,
    });
  },

  // Emit club updates
  emitClubUpdate: (club: any) => {
    if (!io) return;
    io.emit("club:update", club);
  },

  // Emit club deletion
  emitClubDelete: (clubId: string) => {
    if (!io) return;
    io.emit("club:delete", clubId);
  },

  // Force logout a specific user
  emitUserLogout: (userId: string) => {
    if (!io) return;
    // Send to all sockets connected with this user ID
    io.emit("auth:logout", { userId });
  },

  // Notify specific user of account actions
  emitUserAccountAction: (userId: string, action: string, message: string) => {
    if (!io) return;

    // Repeatedly emit the event for deletion to ensure it's received
    if (action === "delete") {
      // Set up a series of broadcasts for deletion events to ensure clients receive it
      const broadcastDeletion = () => {
        const timestamp = Date.now();
        console.log(
          `Broadcasting account deletion for user ${userId} at ${timestamp}`
        );

        // Broadcast the deletion event
        io.emit("auth:account", {
          userId,
          action,
          message,
          timestamp,
          forceLogout: true,
        });

        // Also send a logout event for backward compatibility
        io.emit("auth:logout", {
          userId,
          forced: true,
          timestamp,
          reason: "account_deleted",
        });
      };

      // Immediate broadcast
      broadcastDeletion();

      // Repeated broadcasts over 10 seconds to ensure delivery
      // This handles clients that might reconnect or have intermittent connections
      for (let delay of [200, 500, 1000, 2000, 5000, 10000]) {
        setTimeout(broadcastDeletion, delay);
      }
    } else {
      // For other actions, just emit once
      io.emit("auth:account", { userId, action, message });
    }
  },
};
