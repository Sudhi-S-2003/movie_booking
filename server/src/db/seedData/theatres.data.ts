import { PricingTier } from '../../constants/enums.js';

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const theatreImage = (name: string) => `https://picsum.photos/seed/${slug(name)}-theatre/1200/800`;
const theatreBackdrop = (name: string) => `https://picsum.photos/seed/${slug(name)}-backdrop/1920/1080`;

export const theatresData = [
  // --- INDIA ---
  {
    name: 'Grand PVR Cineplex',
    city: 'Gurugram',
    address: 'DLF Cyber City, Sector 24',
    amenities: ['Parking', 'Food Court', 'Wheelchair Access'],
    location: { type: 'Point', coordinates: [77.0878, 28.4951] },
    screens: [
      { name: 'IMAX Laser 1', type: 'imax', rows: 14, cols: 18 },
      { name: 'Gold Hall', type: 'vip', rows: 7, cols: 9 },
      { name: 'Cinema 3', type: 'standard', rows: 11, cols: 13 },
      { name: 'Cinema 4', type: 'standard', rows: 9, cols: 14 }
    ]
  },
  {
    name: 'INOX Insignia',
    city: 'Mumbai',
    address: 'Atria Mall, Worli',
    amenities: ['Valet Parking', 'Luxury Dining', 'Recliners'],
    location: { type: 'Point', coordinates: [72.8147, 18.9902] },
    screens: [
      { name: 'Insignia 1', type: 'vip', rows: 5, cols: 8 },
      { name: 'Insignia 2', type: 'vip', rows: 6, cols: 7 },
      { name: 'Laser 3', type: 'standard', rows: 13, cols: 16 },
      { name: 'Laser 4', type: 'standard', rows: 10, cols: 15 }
    ]
  },
  {
    name: 'Cinepolis Megaplex',
    city: 'Bangalore',
    address: 'Lulu Mall, Rajajinagar',
    amenities: ['4DX', 'IMAX', 'Coffee Shop'],
    location: { type: 'Point', coordinates: [77.5562, 12.9854] },
    screens: [
      { name: 'IMAX 1', type: 'imax', rows: 16, cols: 22 },
      { name: '4DX 2', type: 'standard', rows: 12, cols: 14 },
      { name: 'Macro XE 3', type: 'standard', rows: 19, cols: 24 },
      { name: 'Hall 4', type: 'standard', rows: 13, cols: 17 }
    ]
  },
  {
    name: 'Sathyam Cinemas',
    city: 'Chennai',
    address: 'Royapettah',
    amenities: ['Iconic Popcorn', 'Heritage Decor', 'Dolby Atmos'],
    location: { type: 'Point', coordinates: [80.2584, 13.0538] },
    screens: [
      { name: 'Sathyam', type: 'imax', rows: 17, cols: 25 },
      { name: 'Santham', type: 'standard', rows: 14, cols: 18 },
      { name: 'Subham', type: 'standard', rows: 12, cols: 22 },
      { name: 'Serene', type: 'standard', rows: 10, cols: 16 }
    ]
  },
  {
    name: 'Phoenix Marketcity PVR',
    city: 'Bangalore',
    address: 'Whitefield',
    amenities: ['Gold Class', 'Bowling Alley', 'D-Box'],
    location: { type: 'Point', coordinates: [77.6960, 12.9918] },
    screens: [
      { name: 'Gold Class 1', type: 'vip', rows: 5, cols: 9 },
      { name: 'Gold Class 2', type: 'vip', rows: 6, cols: 8 },
      { name: 'PXL Screen 3', type: 'imax', rows: 16, cols: 24 },
      { name: 'Standard 4', type: 'standard', rows: 11, cols: 19 },
      { name: 'Standard 5', type: 'standard', rows: 14, cols: 16 }
    ]
  },

  // --- GLOBAL ---
  {
    name: 'AMC Empire 25',
    city: 'New York',
    address: '234 W 42nd St, Times Square',
    amenities: ['IMAX', 'Dolby Cinema', 'Dine-in'],
    location: { type: 'Point', coordinates: [-73.9882, 40.7563] },
    screens: [
      { name: 'IMAX with Laser', type: 'imax', rows: 18, cols: 24 },
      { name: 'Dolby Cinema', type: 'standard', rows: 15, cols: 20 },
      { name: 'Dine-in 1', type: 'vip', rows: 8, cols: 12 },
      { name: 'TCL Hall', type: 'standard', rows: 20, cols: 25 }
    ]
  },
  {
    name: 'BFI IMAX',
    city: 'London',
    address: '1 Charlie Chaplin Walk, Waterloo',
    amenities: ['Worlds Largest IMAX', 'Bar', 'Cafe'],
    location: { type: 'Point', coordinates: [-0.1147, 51.5049] },
    screens: [
      { name: 'The Gigantic Screen', type: 'imax', rows: 25, cols: 32 },
      { name: 'Cinema 2', type: 'standard', rows: 12, cols: 15 }
    ]
  },
  {
    name: 'TOHO Cinemas Shibuya',
    city: 'Tokyo',
    address: '2-6-17 Dogenzaka, Shibuya',
    amenities: ['Gourmet Popcorn', 'Premium Seats', '4DX'],
    location: { type: 'Point', coordinates: [139.6997, 35.6595] },
    screens: [
      { name: 'Grand 1', type: 'imax', rows: 15, cols: 22 },
      { name: '4DX Hall', type: 'standard', rows: 10, cols: 12 },
      { name: 'Cinema 3', type: 'standard', rows: 14, cols: 18 },
      { name: 'Cinema 4', type: 'standard', rows: 11, cols: 15 }
    ]
  },
  {
    name: 'Pathe Quai d\'Ivry',
    city: 'Paris',
    address: '5 Rue Francois Mitterrand',
    amenities: ['IMAX', '4DX', 'Lounge'],
    location: { type: 'Point', coordinates: [2.3850, 48.8180] },
    screens: [
      { name: 'IMAX Laser', type: 'imax', rows: 16, cols: 28 },
      { name: '4DX Screen', type: 'standard', rows: 12, cols: 14 },
      { name: 'Salle Premium', type: 'vip', rows: 6, cols: 12 }
    ]
  },
  {
    name: 'Kinepolis Madrid',
    city: 'Madrid',
    address: 'Calle de la Gran Via',
    amenities: ['Laser Projection', 'Atmos', 'VIP'],
    location: { type: 'Point', coordinates: [-3.7038, 40.4168] },
    screens: [
      { name: 'Mega Screen 1', type: 'imax', rows: 20, cols: 30 },
      { name: 'Atmos Room', type: 'standard', rows: 18, cols: 22 },
      { name: 'VIP 1', type: 'vip', rows: 8, cols: 10 }
    ]
  },
  {
    name: 'PVR Icon',
    city: 'Mumbai',
    address: 'Phoenix Palladium, Lower Parel',
    amenities: ['IMAX', '4DX', 'Luxury Dining', 'Valet Parking'],
    location: { type: 'Point', coordinates: [72.8258, 18.9942] },
    screens: [
      { name: 'IMAX Laser', type: 'imax', rows: 16, cols: 24 },
      { name: 'Icon 2', type: 'standard', rows: 12, cols: 14 },
      { name: 'Icon 3', type: 'standard', rows: 10, cols: 15 }
    ]
  }
];

export const generateLayout = (type: string, rows: number, cols: number) => {
  const layout = [];
  for (let r = 0; r < rows; r++) {
    const rowName = String.fromCharCode(65 + r); 
    const columns = [];
    
    // Design Variation: Center Aisle
    const centerAisle = Math.floor(cols / 2);
    // Design Variation: VIP Boxes (Spaces at edges)
    const isVip = type === 'vip';
    
    for (let c = 1; c <= cols; c++) {
      // Add aisle logic
      if (cols > 10 && c === centerAisle) {
        columns.push({ type: 'space' });
      }
      
      // Side aisles for very wide halls
      if (cols > 20 && (c === 6 || c === cols - 5)) {
        columns.push({ type: 'space' });
      }
      
      let priceGroup: PricingTier = PricingTier.STANDARD;
      
      // Dynamic Pricing Logic
      if (isVip) {
        priceGroup = PricingTier.RECLINER;
      } else if (type === 'imax') {
        if (r < 3) priceGroup = PricingTier.PREMIUM; // Front is premium in IMAX
        else if (r > rows - 4) priceGroup = PricingTier.RECLINER; // Back is recliner
      } else {
        if (r > rows - 3) priceGroup = PricingTier.PREMIUM; // Back rows are premium
      }
      
      columns.push({ type: 'seat', name: String(c), priceGroup });
    }
    layout.push({ type: 'row', name: rowName, columns });
    
    // Add a walkway space halfway through the theater
    if (rows > 10 && r === Math.floor(rows / 2)) {
      layout.push({ type: 'space' });
    }
  }
  return layout;
};
