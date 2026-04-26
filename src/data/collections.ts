export interface Collection {
  id: string;
  title: string;
  date: string;
  itemCount: number;
  type: 'limited' | 'new';
  description: string;
  image: string;
}

export const collections: Collection[] = [
  {
    id: 'sunshine-garden',
    title: "Pompompurin's Sunshine Garden",
    date: 'Apr 16, 2026',
    itemCount: 32,
    type: 'limited',
    description:
      "A limited Special Happy Bag available during the Pompompurin's Party Prep 2026! Event (Apr 16-20). Features furniture and clothing themed around a sunflower garden.",
    image: '/collection-sunshine.jpg',
  },
  {
    id: 'birthday-2026',
    title: "Pompompurin's Birthday 2026",
    date: 'Apr 15, 2026',
    itemCount: 2,
    type: 'new',
    description:
      "A special birthday Happy Bag to celebrate Pompompurin's birthday - free once a day for 7 days!",
    image: '/collection-birthday.jpg',
  },
  {
    id: 'sakura-lantern',
    title: 'Sakura Lantern Night',
    date: 'Apr 13, 2026',
    itemCount: 3,
    type: 'limited',
    description:
      'As cherry blossoms drift through the night, warm moments bloom beneath the lantern light. A regular Happy Bag featuring furniture and clothing themed around cherry blossoms and lanterns. Available Apr 13 - Jun 10, 2026.',
    image: '/collection-sakura.jpg',
  },
  {
    id: 'cinderella',
    title: "Cinderella's White Night Story",
    date: 'Mar 15, 2026',
    itemCount: 4,
    type: 'limited',
    description:
      "Midnight, when Cinderella's magic fades. The moment you pass through the clock garden, the night sky turns white, and time stands still. A Sweet Collection featuring furniture and clothing themed around Cinderella's glass slipper. Available Mar 15 - Apr 14, 2026.",
    image: '/collection-cinderella.jpg',
  },
  {
    id: 'cotton-candy',
    title: 'Cotton Candy Dreams',
    date: 'Feb 19, 2026',
    itemCount: 3,
    type: 'new',
    description:
      'Welcome to a world of cotton candy dreams. Sanrio characters float among fluffy clouds, enjoying endless sweetness. A regular Happy Bag featuring furniture and clothing themed around cotton candy. Available Feb 19 - Apr 22, 2026.',
    image: '/collection-cotton-candy.jpg',
  },
  {
    id: 'midnight-magician',
    title: "Sweet Collection: The Midnight Magician's Invitation",
    date: 'Jan 15, 2025',
    itemCount: 42,
    type: 'limited',
    description:
      "Now, the showtime is about to begin. Are you ready to enter the world of magic? A limited Sweet Collection featuring furniture and clothing inspired by a mysterious magic show with playing card motifs. Available Jan 15 - Feb 14, 2025.",
    image: '/collection-magician.jpg',
  },
];
