// Socket event types for type safety
export interface VenueSocketEvents {
  "venue:update": (venue: any) => void;
  "venue:delete": (venueId: string) => void;
  "venue:attendees:update": (data: { venueId: string; attendees: any[] }) => void;
}

export interface ClubSocketEvents {
  "club:update": (club: any) => void;
  "club:delete": (clubId: string) => void;
}

export interface AuthSocketEvents {
  "auth:logout": (data: { userId: string; forced?: boolean; timestamp?: number; reason?: string }) => void;
  "auth:account": (data: { userId: string; action: string; message: string; timestamp?: number; forceLogout?: boolean }) => void;
}

export interface ClientSocketEvents {
  "join:venue": (venueId: string) => void;
  "leave:venue": (venueId: string) => void;
}

export type ServerToClientEvents = VenueSocketEvents & ClubSocketEvents & AuthSocketEvents;
export type ClientToServerEvents = ClientSocketEvents; 