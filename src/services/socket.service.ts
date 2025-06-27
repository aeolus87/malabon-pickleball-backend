import { Server as SocketIOServer } from "socket.io";
import { IVenue } from "../models/venue.model";
import { ServerToClientEvents, ClientToServerEvents } from "../types/socket.types";

let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;

export const initSocketService = (socketIo: SocketIOServer<ClientToServerEvents, ServerToClientEvents>) => {
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

    const timestamp = Date.now();
    
    if (action === "delete") {
      // Broadcast deletion with immediate and one retry
      const broadcastDeletion = () => {
        io.emit("auth:account", {
          userId,
          action,
          message,
          timestamp,
          forceLogout: true,
        });
        io.emit("auth:logout", {
          userId,
          forced: true,
          timestamp,
          reason: "account_deleted",
        });
      };

      // Immediate broadcast
      broadcastDeletion();
      // Single retry after 1 second
      setTimeout(broadcastDeletion, 1000);
    } else {
      // For other actions, just emit once
      io.emit("auth:account", { userId, action, message, timestamp });
    }
  },
};
