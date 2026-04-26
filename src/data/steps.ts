export interface Step {
  number: number;
  title: string;
  description: string;
}

export const steps: Step[] = [
  {
    number: 1,
    title: 'Set Up Your Profile ',
    description:
      'Click the icon in the top right. Add your display name, buddy, title, and any social links so other traders can find you.',
  },
  {
    number: 2,
    title: 'Add Items to Your Inventory ',
    description:
      'Head to Inventory and add the items you own. Set how many you have and how many are available to trade.',
  },
  {
    number: 3,
    title: 'Build Your Wishlist ',
    description:
      'Go to Wishlist and add items you\'re hunting for. Set a priority and desired quantity so matching listings are easier to find.',
  },
  {
    number: 4,
    title: 'Create a Listing ',
    description:
      'List items directly from your inventory. Your available quantity updates so your listings stay consistent with what you actually own.',
  },
  {
    number: 5,
    title: 'Make or Receive Offers ',
    description:
      'Browse Listings and make offers using items from your inventory. The Fairness Meter shows whether the offer is under, fair, or over based on stored values.',
  },
  {
    number: 6,
    title: 'Complete the Trade ',
    description:
      'Once both traders confirm, the trade is marked complete. If something goes wrong, you can open a dispute and an admin can review it.',
  },
  {
    number: 7,
    title: 'Earn Lucky Trade Tickets ',
    description:
      'Each successful trade earns Lucky Trade Tickets that count toward monthly rewards and SSR giveaway entries.',
  },
];
