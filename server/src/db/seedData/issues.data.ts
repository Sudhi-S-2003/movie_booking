export interface SeedIssue {
  category:    'Technical' | 'Billing' | 'General' | 'Feedback';
  title:       string;
  description: string;
  status:      'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority:    'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** username of the reporter */
  reporter:    string;
  role:        'User' | 'TheatreOwner';
  messages: Array<{ sender: string; senderRole: 'User' | 'Admin' | 'TheatreOwner'; text: string }>;
}

export const issuesSeedData: SeedIssue[] = [
  {
    category:    'Technical',
    title:       'Booking latency in #Mumbai theatres',
    description: 'Seat lock confirmations are timing out at #SouthBombay venues. cc @admin_elite',
    status:      'IN_PROGRESS',
    priority:    'HIGH',
    reporter:    'john_movie_fan',
    role:        'User',
    messages: [
      {
        sender: 'john_movie_fan',
        senderRole: 'User',
        text: 'Hello support, seeing weird behaviour at #FunCinema. @admin_elite can you check if the #payment_gateway is down?',
      },
      {
        sender: 'admin_elite',
        senderRole: 'Admin',
        text: 'Looking at the #latency issues now. @john_movie_fan please share a screenshot. I\'ve notified @grand_owner about the #server_sync.',
      },
    ],
  },
  {
    category:    'Billing',
    title:       'Weekly payout discrepancy #finance',
    description: 'Waiting for the weekly settlement for #PVR_Icon. @admin_elite please check.',
    status:      'OPEN',
    priority:    'MEDIUM',
    reporter:    'grand_owner',
    role:        'TheatreOwner',
    messages: [
      {
        sender: 'grand_owner',
        senderRole: 'TheatreOwner',
        text: 'Any updates on the #payout? @admin_elite the #revenue logs look correct on my end.',
      },
    ],
  },
];
