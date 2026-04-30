import { PricingTier } from '../../constants/enums.js';

export const theatresData = [
  // ─── INDIA — SOUTH ────────────────────────────────────────────────────────
  {
    name: 'Grand PVR Cineplex',
    city: 'gurugram',
    address: 'DLF Cyber City, Sector 24',
    amenities: ['IMAX', 'Parking', 'Food Court', 'Wheelchair Access'],
    location: { type: 'Point', coordinates: [77.0878, 28.4951] },
    screens: [
      { name: 'IMAX Laser 1', type: 'imax',     rows: 14, cols: 18 },
      { name: 'Gold Hall',    type: 'vip',      rows:  7, cols:  9 },
      { name: 'Cinema 3',    type: 'standard', rows: 11, cols: 13 },
      { name: 'Cinema 4',    type: 'standard', rows:  9, cols: 14 },
    ],
  },
  {
    name: 'INOX Insignia',
    city: 'mumbai',
    address: 'Atria Mall, Worli',
    amenities: ['Valet Parking', 'Luxury Dining', 'Recliners', 'Dolby Atmos'],
    location: { type: 'Point', coordinates: [72.8147, 18.9902] },
    screens: [
      { name: 'Insignia 1', type: 'vip',      rows: 5,  cols:  8 },
      { name: 'Insignia 2', type: 'vip',      rows: 6,  cols:  7 },
      { name: 'Laser 3',    type: 'standard', rows: 13, cols: 16 },
      { name: 'Laser 4',    type: 'standard', rows: 10, cols: 15 },
    ],
  },
  {
    name: 'PVR Icon',
    city: 'mumbai',
    address: 'Phoenix Palladium, Lower Parel',
    amenities: ['IMAX', '4DX', 'Luxury Dining', 'Valet Parking'],
    location: { type: 'Point', coordinates: [72.8258, 18.9942] },
    screens: [
      { name: 'IMAX Laser', type: 'imax',     rows: 16, cols: 24 },
      { name: 'Icon 2',     type: 'standard', rows: 12, cols: 14 },
      { name: 'Icon 3',     type: 'standard', rows: 10, cols: 15 },
    ],
  },
  {
    name: 'Cinepolis Megaplex',
    city: 'bangalore',
    address: 'Lulu Mall, Rajajinagar',
    amenities: ['4DX', 'IMAX', 'Coffee Shop', 'Wheelchair Access'],
    location: { type: 'Point', coordinates: [77.5562, 12.9854] },
    screens: [
      { name: 'IMAX 1',      type: 'imax',     rows: 16, cols: 22 },
      { name: '4DX 2',       type: 'standard', rows: 12, cols: 14 },
      { name: 'Macro XE 3',  type: 'standard', rows: 19, cols: 24 },
      { name: 'Hall 4',      type: 'standard', rows: 13, cols: 17 },
    ],
  },
  {
    name: 'Phoenix Marketcity PVR',
    city: 'bangalore',
    address: 'Whitefield',
    amenities: ['Gold Class', 'Bowling Alley', 'D-Box', 'Rooftop Bar'],
    location: { type: 'Point', coordinates: [77.6960, 12.9918] },
    screens: [
      { name: 'Gold Class 1',  type: 'vip',      rows:  5, cols:  9 },
      { name: 'Gold Class 2',  type: 'vip',      rows:  6, cols:  8 },
      { name: 'PXL Screen 3',  type: 'imax',     rows: 16, cols: 24 },
      { name: 'Standard 4',    type: 'standard', rows: 11, cols: 19 },
      { name: 'Standard 5',    type: 'standard', rows: 14, cols: 16 },
    ],
  },
  {
    name: 'Sathyam Cinemas',
    city: 'chennai',
    address: 'Royapettah',
    amenities: ['Iconic Popcorn', 'Heritage Decor', 'Dolby Atmos', 'Parking'],
    location: { type: 'Point', coordinates: [80.2584, 13.0538] },
    screens: [
      { name: 'Sathyam',  type: 'imax',     rows: 17, cols: 25 },
      { name: 'Santham',  type: 'standard', rows: 14, cols: 18 },
      { name: 'Subham',   type: 'standard', rows: 12, cols: 22 },
      { name: 'Serene',   type: 'standard', rows: 10, cols: 16 },
    ],
  },
  {
    name: 'AGS Cinemas',
    city: 'chennai',
    address: 'OMR, Sholinganallur',
    amenities: ['4DX', 'IMAX', 'Gourmet Food Court', 'Valet'],
    location: { type: 'Point', coordinates: [80.2273, 12.9010] },
    screens: [
      { name: 'IMAX Hall',   type: 'imax',     rows: 15, cols: 22 },
      { name: '4DX Screen',  type: 'standard', rows: 11, cols: 13 },
      { name: 'Premium 3',   type: 'vip',      rows:  6, cols:  9 },
      { name: 'Cinema 4',    type: 'standard', rows: 12, cols: 16 },
    ],
  },

  // ─── INDIA — NORTH ────────────────────────────────────────────────────────
  {
    name: 'PVR Saket Select City Walk',
    city: 'delhi',
    address: 'Select City Walk Mall, Saket',
    amenities: ['IMAX', 'Dolby Atmos', 'Luxury Lounge', 'Valet Parking'],
    location: { type: 'Point', coordinates: [77.2109, 28.5274] },
    screens: [
      { name: 'IMAX Laser',   type: 'imax',     rows: 18, cols: 26 },
      { name: 'Director Cut', type: 'vip',      rows:  7, cols: 10 },
      { name: 'PVR 3',        type: 'standard', rows: 14, cols: 18 },
      { name: 'PVR 4',        type: 'standard', rows: 12, cols: 16 },
    ],
  },
  {
    name: 'Cinepolis DLF Avenue',
    city: 'delhi',
    address: 'DLF Avenue Saket',
    amenities: ['VIP Recliners', 'In-Seat Dining', '4DX', 'Kids Zone'],
    location: { type: 'Point', coordinates: [77.2095, 28.5261] },
    screens: [
      { name: '4DX Screen',  type: 'standard', rows: 10, cols: 14 },
      { name: 'VIP Hall',    type: 'vip',      rows:  6, cols:  8 },
      { name: 'Cinema 3',    type: 'standard', rows: 13, cols: 17 },
      { name: 'Cinema 4',    type: 'standard', rows: 11, cols: 15 },
    ],
  },

  // ─── INDIA — EAST ─────────────────────────────────────────────────────────
  {
    name: 'INOX South City',
    city: 'kolkata',
    address: 'South City Mall, Prince Anwar Shah Road',
    amenities: ['IMAX', 'Food Court', 'Game Zone', 'Wheelchair Access'],
    location: { type: 'Point', coordinates: [88.3531, 22.5000] },
    screens: [
      { name: 'IMAX Laser',  type: 'imax',     rows: 15, cols: 20 },
      { name: 'Luxe 2',      type: 'vip',      rows:  6, cols:  8 },
      { name: 'Cinema 3',    type: 'standard', rows: 12, cols: 15 },
      { name: 'Cinema 4',    type: 'standard', rows: 10, cols: 14 },
    ],
  },
  {
    name: 'Cineplex Swabhumi',
    city: 'kolkata',
    address: 'EM Bypass, Swabhumi Heritage',
    amenities: ['Heritage Decor', 'Dolby Atmos', 'Courtyard Cafe'],
    location: { type: 'Point', coordinates: [88.3697, 22.5580] },
    screens: [
      { name: 'Grand Hall',   type: 'imax',     rows: 14, cols: 22 },
      { name: 'Studio 2',     type: 'standard', rows: 10, cols: 15 },
      { name: 'Studio 3',     type: 'standard', rows:  9, cols: 13 },
    ],
  },

  // ─── INDIA — WEST ─────────────────────────────────────────────────────────
  {
    name: 'Cinepolis VIP Amanora',
    city: 'pune',
    address: 'Amanora Mall, Hadapsar',
    amenities: ['VIP Recliners', 'Private Screening', 'Premium Dining', 'Parking'],
    location: { type: 'Point', coordinates: [73.9540, 18.5088] },
    screens: [
      { name: 'VIP 1',      type: 'vip',      rows:  5, cols:  8 },
      { name: 'VIP 2',      type: 'vip',      rows:  6, cols:  9 },
      { name: 'IMAX Hall',  type: 'imax',     rows: 14, cols: 20 },
      { name: 'Standard 4', type: 'standard', rows: 11, cols: 15 },
    ],
  },
  {
    name: 'PVR Cinemas Westend Mall',
    city: 'pune',
    address: 'Aundh, Near Westend Mall',
    amenities: ['Dolby Atmos', 'Food Court', 'Wheelchair Access'],
    location: { type: 'Point', coordinates: [73.8121, 18.5590] },
    screens: [
      { name: 'Atmos Hall', type: 'standard', rows: 14, cols: 18 },
      { name: 'Premium 2',  type: 'vip',      rows:  6, cols:  8 },
      { name: 'Cinema 3',   type: 'standard', rows: 11, cols: 14 },
    ],
  },

  // ─── INDIA — TELANGANA & AP ───────────────────────────────────────────────
  {
    name: 'AMB Cinemas Hyderabad',
    city: 'hyderabad',
    address: 'Gachibowli, Financial District',
    amenities: ['4K Laser', 'In-Seat Dining', 'Bar', 'Valet', 'IMAX'],
    location: { type: 'Point', coordinates: [78.3292, 17.4435] },
    screens: [
      { name: 'IMAX Laser', type: 'imax',     rows: 16, cols: 24 },
      { name: 'Luxe 2',     type: 'vip',      rows:  7, cols: 10 },
      { name: 'Premiere 3', type: 'vip',      rows:  6, cols:  9 },
      { name: 'Standard 4', type: 'standard', rows: 13, cols: 17 },
      { name: 'Standard 5', type: 'standard', rows: 11, cols: 16 },
    ],
  },
  {
    name: 'Prasads IMAX',
    city: 'hyderabad',
    address: 'NTR Marg, Tank Bund Road',
    amenities: ['Worlds Largest IMAX in India', 'Food Plaza', 'Shopping'],
    location: { type: 'Point', coordinates: [78.4867, 17.4059] },
    screens: [
      { name: 'The Giant IMAX', type: 'imax',     rows: 24, cols: 30 },
      { name: 'Digital 2',      type: 'standard', rows: 13, cols: 18 },
      { name: 'Digital 3',      type: 'standard', rows: 11, cols: 15 },
    ],
  },

  // ─── INDIA — KERALA ───────────────────────────────────────────────────────
  {
    name: 'PVR Lulu Mall Kochi',
    city: 'kochi',
    address: 'LuLu Mall, Edapally',
    amenities: ['IMAX', '4DX', 'Food Court', 'Parking', 'Wheelchair Access'],
    location: { type: 'Point', coordinates: [76.3057, 10.0205] },
    screens: [
      { name: 'IMAX Hall',  type: 'imax',     rows: 15, cols: 22 },
      { name: '4DX Screen', type: 'standard', rows: 10, cols: 12 },
      { name: 'Gold 3',     type: 'vip',      rows:  6, cols:  9 },
      { name: 'Cinema 4',   type: 'standard', rows: 12, cols: 16 },
    ],
  },
  {
    name: 'Cinepolis Gold Kochi',
    city: 'kochi',
    address: 'Oberon Mall, Edapally',
    amenities: ['Gold Class', 'Recliners', 'Private Bar', 'Dolby Atmos'],
    location: { type: 'Point', coordinates: [76.3041, 10.0190] },
    screens: [
      { name: 'Gold 1',     type: 'vip',      rows:  5, cols:  7 },
      { name: 'Atmos Hall', type: 'standard', rows: 14, cols: 20 },
      { name: 'Cinema 3',   type: 'standard', rows: 10, cols: 15 },
    ],
  },

  // ─── GLOBAL ───────────────────────────────────────────────────────────────
  {
    name: 'AMC Empire 25',
    city: 'new york',
    address: '234 W 42nd St, Times Square',
    amenities: ['IMAX', 'Dolby Cinema', 'Dine-in', 'Reserved Seating'],
    location: { type: 'Point', coordinates: [-73.9882, 40.7563] },
    screens: [
      { name: 'IMAX with Laser', type: 'imax',     rows: 18, cols: 24 },
      { name: 'Dolby Cinema',    type: 'standard', rows: 15, cols: 20 },
      { name: 'Dine-in 1',       type: 'vip',      rows:  8, cols: 12 },
      { name: 'TCL Hall',        type: 'standard', rows: 20, cols: 25 },
    ],
  },
  {
    name: 'Regal LA Live',
    city: 'los angeles',
    address: '1000 W Olympic Blvd, Downtown LA',
    amenities: ['RPX', 'IMAX', 'Sports Bar', 'Dine-in', 'Valet Parking'],
    location: { type: 'Point', coordinates: [-118.2672, 34.0432] },
    screens: [
      { name: 'RPX 1',     type: 'imax',     rows: 17, cols: 23 },
      { name: 'Dine-in 2', type: 'vip',      rows:  8, cols: 11 },
      { name: 'Regal 3',   type: 'standard', rows: 16, cols: 20 },
      { name: 'Regal 4',   type: 'standard', rows: 14, cols: 18 },
    ],
  },
  {
    name: 'BFI IMAX',
    city: 'london',
    address: '1 Charlie Chaplin Walk, Waterloo',
    amenities: ['Worlds Largest IMAX', 'Bar', 'Cafe', 'Festival Venue'],
    location: { type: 'Point', coordinates: [-0.1147, 51.5049] },
    screens: [
      { name: 'The Gigantic Screen', type: 'imax',     rows: 25, cols: 32 },
      { name: 'Cinema 2',            type: 'standard', rows: 12, cols: 15 },
    ],
  },
  {
    name: 'TOHO Cinemas Shibuya',
    city: 'tokyo',
    address: '2-6-17 Dogenzaka, Shibuya',
    amenities: ['Gourmet Popcorn', 'Premium Seats', '4DX', 'Anime Screenings'],
    location: { type: 'Point', coordinates: [139.6997, 35.6595] },
    screens: [
      { name: 'Grand 1',   type: 'imax',     rows: 15, cols: 22 },
      { name: '4DX Hall',  type: 'standard', rows: 10, cols: 12 },
      { name: 'Cinema 3',  type: 'standard', rows: 14, cols: 18 },
      { name: 'Cinema 4',  type: 'standard', rows: 11, cols: 15 },
    ],
  },
  {
    name: 'CGV Yongsan I\'Park Mall',
    city: 'seoul',
    address: '55 Hangang-daero 23-gil, Yongsan-gu',
    amenities: ['4DX', 'ScreenX', 'IMAX', 'CGV Starium', 'VIP Lounge'],
    location: { type: 'Point', coordinates: [126.9710, 37.5300] },
    screens: [
      { name: 'IMAX Hall',    type: 'imax',     rows: 16, cols: 24 },
      { name: '4DX Screen',   type: 'standard', rows: 10, cols: 13 },
      { name: 'ScreenX',      type: 'standard', rows: 14, cols: 20 },
      { name: 'Starium',      type: 'vip',      rows:  7, cols: 10 },
      { name: 'Gold Class',   type: 'vip',      rows:  5, cols:  8 },
    ],
  },
  {
    name: 'VOX Cinemas Mall of the Emirates',
    city: 'dubai',
    address: 'Mall of the Emirates, Sheikh Zayed Road',
    amenities: ['IMAX', '4DX', 'Gold Lounge', 'In-Seat Dining', 'Kids Cinema'],
    location: { type: 'Point', coordinates: [55.2004, 25.1184] },
    screens: [
      { name: 'IMAX Laser',  type: 'imax',     rows: 18, cols: 26 },
      { name: '4DX Screen',  type: 'standard', rows: 11, cols: 13 },
      { name: 'Gold Hall 3', type: 'vip',      rows:  6, cols:  9 },
      { name: 'Gold Hall 4', type: 'vip',      rows:  5, cols:  8 },
      { name: 'Standard 5',  type: 'standard', rows: 14, cols: 18 },
    ],
  },
  {
    name: 'Pathé Quai d\'Ivry',
    city: 'paris',
    address: '5 Rue François Mitterrand',
    amenities: ['IMAX', '4DX', 'Lounge', 'Art House Screenings'],
    location: { type: 'Point', coordinates: [2.3850, 48.8180] },
    screens: [
      { name: 'IMAX Laser',    type: 'imax',     rows: 16, cols: 28 },
      { name: '4DX Screen',    type: 'standard', rows: 12, cols: 14 },
      { name: 'Salle Premium', type: 'vip',      rows:  6, cols: 12 },
    ],
  },
  {
    name: 'Kinepolis Madrid',
    city: 'madrid',
    address: 'Calle de la Gran Vía',
    amenities: ['Laser Projection', 'Atmos', 'VIP', 'Rooftop Bar'],
    location: { type: 'Point', coordinates: [-3.7038, 40.4168] },
    screens: [
      { name: 'Mega Screen 1', type: 'imax',     rows: 20, cols: 30 },
      { name: 'Atmos Room',    type: 'standard', rows: 18, cols: 22 },
      { name: 'VIP 1',         type: 'vip',      rows:  8, cols: 10 },
    ],
  },
];

export const generateLayout = (type: string, rows: number, cols: number) => {
  const layout = [];
  for (let r = 0; r < rows; r++) {
    const rowName = String.fromCharCode(65 + r);
    const columns = [];

    const centerAisle = Math.floor(cols / 2);
    const isVip = type === 'vip';

    for (let c = 1; c <= cols; c++) {
      if (cols > 10 && c === centerAisle) {
        columns.push({ type: 'space' });
      }
      if (cols > 20 && (c === 6 || c === cols - 5)) {
        columns.push({ type: 'space' });
      }

      let priceGroup: PricingTier = PricingTier.STANDARD;
      if (isVip) {
        priceGroup = PricingTier.RECLINER;
      } else if (type === 'imax') {
        if (r < 3)           priceGroup = PricingTier.PREMIUM;
        else if (r > rows - 4) priceGroup = PricingTier.RECLINER;
      } else {
        if (r > rows - 3)    priceGroup = PricingTier.PREMIUM;
      }

      columns.push({ type: 'seat', name: String(c), priceGroup });
    }
    layout.push({ type: 'row', name: rowName, columns });

    if (rows > 10 && r === Math.floor(rows / 2)) {
      layout.push({ type: 'space' });
    }
  }
  return layout;
};
