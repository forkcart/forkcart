/**
 * Seed 500 realistic products across categories.
 * Run: npx tsx scripts/seed-500.ts
 */

import pg from 'pg';
import { randomUUID } from 'crypto';

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  user: 'forkcart',
  password: 'forkcart',
  database: 'forkcart',
});

// Category IDs
const CAT = {
  electronics: 'bd726732-3f69-427f-88c3-88226d15fb92',
  clothing: '9ea59e5a-aa73-4a0e-9b85-c225fea15f52',
  home: '2ff27e49-42a6-4abb-9107-fbfd6583ed72',
  books: '089ca549-3010-45cb-b89d-1798a627aa6d',
};

// Add more categories first
const newCategories = [
  { id: randomUUID(), name: 'Sports & Outdoors', slug: 'sports-outdoors' },
  { id: randomUUID(), name: 'Kitchen', slug: 'kitchen' },
  { id: randomUUID(), name: 'Toys & Games', slug: 'toys-games' },
  { id: randomUUID(), name: 'Health & Beauty', slug: 'health-beauty' },
  { id: randomUUID(), name: 'Office & Stationery', slug: 'office-stationery' },
  { id: randomUUID(), name: 'Automotive', slug: 'automotive' },
  { id: randomUUID(), name: 'Pet Supplies', slug: 'pet-supplies' },
  { id: randomUUID(), name: 'Music & Instruments', slug: 'music-instruments' },
];

interface Product {
  name: string;
  description: string;
  shortDescription: string;
  price: number; // cents
  compareAtPrice: number | null;
  costPrice: number;
  weight: number; // grams
  sku: string;
  category: string; // category id
  metaTitle?: string;
  metaDescription?: string;
  inventoryQuantity: number;
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generate product data by category
function generateProducts(): Product[] {
  const products: Product[] = [];
  let skuCounter = 1000;

  const electronicsProducts = [
    // Headphones & Audio
    ...[
      'Studio',
      'Sport',
      'Travel',
      'Gaming',
      'Wireless',
      'Pro',
      'Lite',
      'Ultra',
      'Air',
      'Max',
    ].flatMap((prefix) =>
      ['Headphones', 'Earbuds', 'Earphones'].map((type) => {
        const p = rand(1999, 19999);
        return {
          name: `${prefix} ${type} ${pick(['X1', 'S2', 'Pro', 'Elite', 'Plus', 'SE'])}`,
          description: `Premium ${type.toLowerCase()} with active noise cancellation, ${rand(20, 60)}h battery life, and crystal-clear audio. Features Bluetooth ${pick(['5.0', '5.2', '5.3'])}, multipoint connection, and ${pick(['memory foam', 'silicone', 'leather'])} ear cushions. IPX${rand(4, 7)} water resistant.`,
          shortDescription: `${prefix} ${type.toLowerCase()} with ANC and ${rand(20, 60)}h battery`,
          price: p,
          compareAtPrice: Math.random() > 0.5 ? p + rand(1000, 5000) : null,
          costPrice: Math.floor(p * 0.4),
          weight: rand(150, 350),
          sku: `EL-AUD-${++skuCounter}`,
          category: CAT.electronics,
          inventoryQuantity: rand(5, 200),
        };
      }),
    ),
    // Chargers & Cables
    ...Array.from({ length: 15 }, () => {
      const watts = pick([20, 30, 45, 65, 100, 140]);
      const ports = pick(['USB-C', 'Dual USB-C', 'USB-C + USB-A', 'Triple Port']);
      const p = rand(999, 4999);
      return {
        name: `${watts}W ${ports} ${pick(['GaN', 'Fast', 'Quick', 'Turbo'])} Charger ${pick(['Mini', 'Compact', 'Pro', 'Slim', 'Travel'])}`,
        description: `${watts}W ${ports} fast charger with GaN technology. Compatible with iPhone, Samsung, iPad, MacBook, and all USB-C devices. ${pick(['Foldable plug', 'LED indicator', 'Smart power distribution'])}. CE certified, overcurrent protection.`,
        shortDescription: `${watts}W ${ports} GaN charger`,
        price: p,
        compareAtPrice: Math.random() > 0.6 ? p + rand(500, 2000) : null,
        costPrice: Math.floor(p * 0.3),
        weight: rand(50, 200),
        sku: `EL-CHG-${++skuCounter}`,
        category: CAT.electronics,
        inventoryQuantity: rand(20, 500),
      };
    }),
    // Smart Home
    ...Array.from({ length: 15 }, () => {
      const device = pick([
        'Smart Plug',
        'LED Strip',
        'Smart Bulb',
        'Motion Sensor',
        'Door Sensor',
        'Smart Switch',
        'WiFi Camera',
        'Smart Thermostat',
        'Smart Lock',
        'Air Quality Monitor',
        'Smart Doorbell',
        'Robot Vacuum',
        'Smart Speaker',
        'WiFi Extender',
        'Smart Display',
      ]);
      const brand = pick(['Lumio', 'Nexo', 'CasaTech', 'BrightHome', 'ZenHub']);
      const p = rand(999, 14999);
      return {
        name: `${brand} ${device} ${pick(['', 'Pro', 'Mini', 'Plus', 'V2'])}`.trim(),
        description: `${brand} ${device} — works with Alexa, Google Home, and Apple HomeKit. Easy setup via app, no hub required. ${pick(['Energy monitoring', 'Voice control', 'Scheduling', 'Scene automation'])} included. WiFi ${pick(['2.4GHz', '2.4/5GHz dual-band'])}.`,
        shortDescription: `${brand} ${device} with voice control`,
        price: p,
        compareAtPrice: Math.random() > 0.5 ? p + rand(1000, 5000) : null,
        costPrice: Math.floor(p * 0.35),
        weight: rand(80, 2000),
        sku: `EL-SH-${++skuCounter}`,
        category: CAT.electronics,
        inventoryQuantity: rand(10, 150),
      };
    }),
    // Phone Accessories
    ...Array.from({ length: 15 }, () => {
      const item = pick([
        'Phone Case',
        'Screen Protector',
        'Phone Stand',
        'Car Mount',
        'Wireless Charger',
        'Power Bank',
        'Camera Lens Kit',
        'Gimbal Stabilizer',
        'Ring Light',
        'Selfie Stick',
        'Phone Grip',
        'MagSafe Wallet',
        'Tablet Stand',
        'Stylus Pen',
        'Keyboard Case',
      ]);
      const p = rand(499, 7999);
      return {
        name: `${pick(['Premium', 'Ultra', 'Pro', 'Essential', 'Deluxe'])} ${item}${pick([' Black', ' White', ' Clear', ' Navy', ''])}`,
        description: `High-quality ${item.toLowerCase()} designed for daily use. ${pick(['Drop-tested', 'Scratch-resistant', 'Anti-fingerprint', 'Shockproof'])} construction. Compatible with ${pick(['all smartphones', 'iPhone 14-16', 'Samsung Galaxy S23-S25', 'most devices'])}.`,
        shortDescription: `${item} — premium quality`,
        price: p,
        compareAtPrice: Math.random() > 0.5 ? p + rand(300, 3000) : null,
        costPrice: Math.floor(p * 0.25),
        weight: rand(30, 500),
        sku: `EL-PH-${++skuCounter}`,
        category: CAT.electronics,
        inventoryQuantity: rand(15, 300),
      };
    }),
  ];

  const clothingProducts = [
    // T-Shirts
    ...Array.from({ length: 20 }, () => {
      const style = pick(['Classic', 'Slim Fit', 'Relaxed', 'Oversized', 'Boxy']);
      const material = pick([
        'Organic Cotton',
        '100% Cotton',
        'Cotton-Linen Blend',
        'Bamboo Fabric',
        'Merino Wool',
      ]);
      const color = pick([
        'Black',
        'White',
        'Navy',
        'Olive',
        'Burgundy',
        'Charcoal',
        'Stone',
        'Forest Green',
        'Dusty Rose',
        'Midnight Blue',
      ]);
      const p = rand(1499, 4999);
      return {
        name: `${style} T-Shirt ${color}`,
        description: `${style} fit t-shirt in ${color.toLowerCase()}. Made from ${material.toLowerCase()} — breathable, soft, and durable. Pre-shrunk, reinforced seams, and tag-free neck label for comfort. Machine washable at 40°C.`,
        shortDescription: `${style} ${material.toLowerCase()} tee in ${color.toLowerCase()}`,
        price: p,
        compareAtPrice: Math.random() > 0.6 ? p + rand(500, 1500) : null,
        costPrice: Math.floor(p * 0.3),
        weight: rand(150, 250),
        sku: `CL-TS-${++skuCounter}`,
        category: CAT.clothing,
        inventoryQuantity: rand(20, 300),
      };
    }),
    // Jeans & Pants
    ...Array.from({ length: 15 }, () => {
      const type = pick([
        'Slim Jeans',
        'Straight Jeans',
        'Tapered Chinos',
        'Cargo Pants',
        'Wide Leg Jeans',
        'Jogger Pants',
        'Linen Trousers',
        'Corduroy Pants',
      ]);
      const color = pick([
        'Indigo',
        'Black',
        'Light Wash',
        'Khaki',
        'Olive',
        'Stone',
        'Dark Grey',
        'Navy',
      ]);
      const p = rand(3999, 9999);
      return {
        name: `${type} ${color}`,
        description: `${type} in ${color.toLowerCase()}. ${pick(['Stretch denim', 'Premium cotton twill', 'Japanese selvedge denim', 'Italian cotton'])} with ${pick(['zip fly', 'button fly'])}. ${pick(['5-pocket styling', 'Cargo pockets', 'Slash pockets'])}. ${pick(['Regular', 'Mid', 'High'])} rise.`,
        shortDescription: `${type} — ${color.toLowerCase()}, premium quality`,
        price: p,
        compareAtPrice: Math.random() > 0.5 ? p + rand(1000, 3000) : null,
        costPrice: Math.floor(p * 0.35),
        weight: rand(400, 700),
        sku: `CL-PT-${++skuCounter}`,
        category: CAT.clothing,
        inventoryQuantity: rand(10, 150),
      };
    }),
    // Jackets & Outerwear
    ...Array.from({ length: 15 }, () => {
      const type = pick([
        'Bomber Jacket',
        'Denim Jacket',
        'Rain Jacket',
        'Puffer Vest',
        'Parka',
        'Blazer',
        'Hoodie',
        'Fleece Jacket',
        'Windbreaker',
        'Quilted Jacket',
        'Leather Jacket',
        'Overshirt',
        'Track Jacket',
        'Cardigan',
        'Softshell Jacket',
      ]);
      const color = pick([
        'Black',
        'Navy',
        'Olive',
        'Tan',
        'Burgundy',
        'Charcoal',
        'Brown',
        'Grey',
      ]);
      const p = rand(4999, 19999);
      return {
        name: `${type} ${color}`,
        description: `${type} in ${color.toLowerCase()}. ${pick(['Water-repellent', 'Insulated', 'Breathable', 'Lightweight', 'Heavyweight'])} construction. Features ${pick(['YKK zippers', 'snap buttons', 'hidden zip closure'])} and ${pick(['inner pockets', 'adjustable cuffs', 'drawstring hem', 'removable hood'])}.`,
        shortDescription: `${type} — ${color.toLowerCase()}`,
        price: p,
        compareAtPrice: Math.random() > 0.4 ? p + rand(2000, 8000) : null,
        costPrice: Math.floor(p * 0.4),
        weight: rand(300, 1200),
        sku: `CL-JK-${++skuCounter}`,
        category: CAT.clothing,
        inventoryQuantity: rand(5, 80),
      };
    }),
    // Shoes & Sneakers
    ...Array.from({ length: 15 }, () => {
      const type = pick([
        'Running Shoes',
        'Canvas Sneakers',
        'Leather Boots',
        'Hiking Boots',
        'Slip-On Loafers',
        'White Sneakers',
        'Trail Runners',
        'Chelsea Boots',
        'Sandals',
        'Espadrilles',
        'High-Top Sneakers',
        'Oxford Shoes',
        'Desert Boots',
        'Platform Sneakers',
        'Minimalist Runners',
      ]);
      const color = pick(['Black', 'White', 'Brown', 'Navy', 'Grey', 'Tan', 'Olive']);
      const p = rand(3999, 14999);
      return {
        name: `${type} ${color}`,
        description: `${type} in ${color.toLowerCase()}. ${pick(['Cushioned insole', 'Memory foam footbed', 'Cork footbed', 'EVA midsole'])} for all-day comfort. ${pick(['Rubber outsole', 'Vibram sole', 'Crepe sole', 'Leather sole'])} with excellent grip. ${pick(['Vegan', 'Full-grain leather', 'Recycled materials', 'Suede upper'])}.`,
        shortDescription: `${type} — ${color.toLowerCase()}, comfort fit`,
        price: p,
        compareAtPrice: Math.random() > 0.5 ? p + rand(1500, 5000) : null,
        costPrice: Math.floor(p * 0.35),
        weight: rand(250, 900),
        sku: `CL-SH-${++skuCounter}`,
        category: CAT.clothing,
        inventoryQuantity: rand(5, 100),
      };
    }),
  ];

  const homeProducts = [
    // Furniture & Decor
    ...Array.from({ length: 20 }, () => {
      const item = pick([
        'Throw Pillow',
        'Scented Candle',
        'Wall Clock',
        'Photo Frame',
        'Vase',
        'Table Lamp',
        'Blanket',
        'Doormat',
        'Mirror',
        'Shelf',
        'Plant Pot',
        'Storage Basket',
        'Curtains',
        'Rug',
        'Wall Art',
        'Coasters Set',
        'Bookend',
        'Trinket Tray',
        'Incense Holder',
        'Wind Chime',
      ]);
      const style = pick([
        'Modern',
        'Minimalist',
        'Boho',
        'Scandinavian',
        'Industrial',
        'Rustic',
        'Art Deco',
        'Japanese',
      ]);
      const material = pick([
        'Ceramic',
        'Wood',
        'Glass',
        'Cotton',
        'Bamboo',
        'Metal',
        'Concrete',
        'Rattan',
      ]);
      const p = rand(799, 7999);
      return {
        name: `${style} ${material} ${item}`,
        description: `${style}-inspired ${item.toLowerCase()} crafted from ${material.toLowerCase()}. ${pick(['Handmade', 'Machine-crafted', 'Artisan-made', 'Fair trade'])}. Dimensions: ${rand(10, 60)}×${rand(10, 60)}×${rand(5, 40)} cm. ${pick(['Perfect for living room', 'Ideal for bedroom', 'Great for office', 'Versatile placement'])}.`,
        shortDescription: `${style} ${material.toLowerCase()} ${item.toLowerCase()}`,
        price: p,
        compareAtPrice: Math.random() > 0.5 ? p + rand(500, 3000) : null,
        costPrice: Math.floor(p * 0.35),
        weight: rand(100, 3000),
        sku: `HG-DC-${++skuCounter}`,
        category: CAT.home,
        inventoryQuantity: rand(5, 100),
      };
    }),
    // Garden
    ...Array.from({ length: 15 }, () => {
      const item = pick([
        'Garden Gloves',
        'Pruning Shears',
        'Watering Can',
        'Plant Marker Set',
        'Seed Starter Kit',
        'Herb Garden Kit',
        'Garden Kneeler',
        'Bird Feeder',
        'Solar Light Set',
        'Raised Bed Kit',
        'Compost Bin',
        'Garden Hose',
        'Trellis',
        'Potting Soil',
        'Lawn Sprinkler',
      ]);
      const p = rand(599, 5999);
      return {
        name: `${pick(['Premium', 'Eco', 'Professional', 'Heavy-Duty', 'Starter'])} ${item}`,
        description: `High-quality ${item.toLowerCase()} for your garden. ${pick(['Weather-resistant', 'UV-protected', 'Eco-friendly materials', 'Rust-proof'])}. ${pick(['Ergonomic design', 'Easy assembly', 'Collapsible for storage', 'Includes instructions'])}. Made from ${pick(['recycled plastic', 'stainless steel', 'FSC-certified wood', 'organic materials'])}.`,
        shortDescription: `${item} for garden enthusiasts`,
        price: p,
        compareAtPrice: Math.random() > 0.5 ? p + rand(300, 2000) : null,
        costPrice: Math.floor(p * 0.3),
        weight: rand(100, 5000),
        sku: `HG-GR-${++skuCounter}`,
        category: CAT.home,
        inventoryQuantity: rand(10, 200),
      };
    }),
    // Bedding & Bath
    ...Array.from({ length: 15 }, () => {
      const item = pick([
        'Bed Sheet Set',
        'Duvet Cover',
        'Bath Towel Set',
        'Pillow',
        'Mattress Topper',
        'Weighted Blanket',
        'Shower Curtain',
        'Bath Mat',
        'Bathrobe',
        'Hand Towel Set',
        'Fitted Sheet',
        'Pillowcase Pair',
        'Quilt',
        'Throw',
        'Mattress Protector',
      ]);
      const material = pick([
        'Egyptian Cotton',
        'Bamboo',
        'Linen',
        'Microfiber',
        'Organic Cotton',
        'Sateen',
      ]);
      const color = pick([
        'White',
        'Grey',
        'Sage',
        'Navy',
        'Blush',
        'Charcoal',
        'Cream',
        'Terracotta',
      ]);
      const p = rand(1499, 12999);
      return {
        name: `${material} ${item} ${color}`,
        description: `Luxurious ${item.toLowerCase()} in ${color.toLowerCase()}, made from premium ${material.toLowerCase()}. ${pick(['400', '600', '800', '1000'])} thread count. OEKO-TEX certified. Machine washable at ${pick(['40', '60'])}°C. ${pick(['Hypoallergenic', 'Anti-bacterial', 'Temperature-regulating', 'Moisture-wicking'])}.`,
        shortDescription: `${material} ${item.toLowerCase()} — ${color.toLowerCase()}`,
        price: p,
        compareAtPrice: Math.random() > 0.4 ? p + rand(1000, 5000) : null,
        costPrice: Math.floor(p * 0.35),
        weight: rand(300, 3000),
        sku: `HG-BB-${++skuCounter}`,
        category: CAT.home,
        inventoryQuantity: rand(10, 150),
      };
    }),
  ];

  const bookProducts = Array.from({ length: 40 }, () => {
    const genre = pick([
      'Science Fiction',
      'Biography',
      'Self-Help',
      'History',
      'Thriller',
      'Fantasy',
      'Cookbook',
      'Business',
      'Philosophy',
      'Poetry',
      'Travel',
      'Art',
      'Psychology',
      'Programming',
      'Science',
    ]);
    const titles: Record<string, string[]> = {
      'Science Fiction': [
        'The Last Algorithm',
        'Quantum Echo',
        'Neon Horizons',
        'Signal Lost',
        'The Memory Thief',
      ],
      Biography: [
        'Unfiltered',
        'Against All Odds',
        'The Long Road Home',
        'Beyond the Spotlight',
        'Written in Stone',
      ],
      'Self-Help': [
        'Atomic Focus',
        'The 5AM Revolution',
        'Unfuckwithable',
        'Deep Clarity',
        'The Calm Code',
      ],
      History: [
        'Empire of Dust',
        'The Hidden Century',
        'Rebel Codes',
        'When Walls Fell',
        'Crossroads of Time',
      ],
      Thriller: [
        'Dead Reckoning',
        'Cold Trail',
        'The Last Witness',
        'Shadow Protocol',
        'Broken Silence',
      ],
      Fantasy: ['Crown of Thorns', 'The Ember Gate', 'Skyborn', 'The Lost Kingdom', 'Iron & Ivy'],
      Cookbook: [
        'Simple Feasts',
        'One Pot Wonders',
        'Fermented',
        'The Spice Atlas',
        'Weekend Baker',
      ],
      Business: [
        'Zero to Scale',
        'The Lean Builder',
        'Revenue Rebels',
        'First Principles',
        'Network Effects',
      ],
      Philosophy: [
        'The Examined Life',
        'Being & Doing',
        'Letters to No One',
        'The Quiet Mind',
        'Ethics of AI',
      ],
      Poetry: ['Rainfall', 'Ink & Light', 'The Still Hour', 'Fragments', 'Unwritten'],
      Travel: [
        'Off the Map',
        'Slow Roads',
        'Lost in Translation',
        'The Train Diaries',
        'Coastal Walks',
      ],
      Art: [
        'Color Theory',
        'The Sketch Book',
        'Abstract Minds',
        'Photography 101',
        'Design Patterns',
      ],
      Psychology: [
        'Wired for Connection',
        'The Bias Trap',
        'Mind Over Mind',
        'Flow States',
        'The Social Brain',
      ],
      Programming: [
        'Rust in Action',
        'TypeScript Patterns',
        'System Design',
        'Clean Architecture',
        'The Go Way',
      ],
      Science: [
        'The Elegant Universe',
        'DNA Decoded',
        'Climate Logic',
        'Quantum Questions',
        'The Brain Atlas',
      ],
    };
    const title = pick(titles[genre] || ['Unknown Title']);
    const author = `${pick(['James', 'Sarah', 'Michael', 'Emma', 'David', 'Anna', 'Robert', 'Lisa', 'Thomas', 'Maria'])} ${pick(['Chen', 'Smith', 'Weber', 'Kim', 'Patel', 'Müller', 'Rossi', 'Silva', 'Tanaka', 'Brown'])}`;
    const pages = rand(180, 600);
    const p = rand(899, 2999);
    return {
      name: `${title} — ${genre}`,
      description: `"${title}" by ${author}. A compelling ${genre.toLowerCase()} book spanning ${pages} pages. ${pick(['Hardcover edition', 'Paperback', 'Special edition with foreword'])}. Published ${2024 + rand(0, 2)}. ${pick(['New York Times Bestseller', 'Award-winning', 'Critically acclaimed', 'International bestseller', 'Debut novel'])}.`,
      shortDescription: `${genre} by ${author}, ${pages} pages`,
      price: p,
      compareAtPrice: Math.random() > 0.6 ? p + rand(300, 1000) : null,
      costPrice: Math.floor(p * 0.4),
      weight: rand(200, 600),
      sku: `BK-${genre.substring(0, 3).toUpperCase()}-${++skuCounter}`,
      category: CAT.books,
      inventoryQuantity: rand(10, 500),
    };
  });

  // Sports & Outdoors
  const sportsId = newCategories[0].id;
  const sportsProducts = Array.from({ length: 40 }, () => {
    const item = pick([
      'Yoga Mat',
      'Resistance Bands Set',
      'Dumbbell Set',
      'Jump Rope',
      'Foam Roller',
      'Water Bottle',
      'Gym Bag',
      'Running Belt',
      'Fitness Tracker Band',
      'Pull-Up Bar',
      'Exercise Ball',
      'Kettlebell',
      'Ab Wheel',
      'Ankle Weights',
      'Push-Up Board',
      'Cycling Gloves',
      'Swim Goggles',
      'Tennis Balls',
      'Hiking Poles',
      'Camping Hammock',
      'Headlamp',
      'Dry Bag',
      'Insulated Flask',
      'Compression Socks',
      'Sports Tape',
      'Climbing Chalk',
      'Skipping Rope',
      'Balance Board',
      'Grip Strengthener',
      'Massage Gun',
    ]);
    const p = rand(799, 8999);
    return {
      name: `${pick(['Pro', 'Elite', 'Sport', 'Active', 'Peak'])} ${item}${pick([' Black', ' Red', ' Blue', ''])}`,
      description: `Professional-grade ${item.toLowerCase()} for athletes and fitness enthusiasts. ${pick(['Non-slip surface', 'Ergonomic grip', 'Sweat-resistant', 'Quick-dry material', 'Anti-odor treatment'])}. ${pick(['Includes carry bag', 'Compact design', 'Travel-friendly', 'Lifetime warranty'])}. Suitable for ${pick(['beginners', 'intermediate', 'advanced', 'all levels'])}.`,
      shortDescription: `${item} — professional quality`,
      price: p,
      compareAtPrice: Math.random() > 0.5 ? p + rand(500, 3000) : null,
      costPrice: Math.floor(p * 0.3),
      weight: rand(100, 5000),
      sku: `SP-${++skuCounter}`,
      category: sportsId,
      inventoryQuantity: rand(10, 200),
    };
  });

  // Kitchen
  const kitchenId = newCategories[1].id;
  const kitchenProducts = Array.from({ length: 40 }, () => {
    const item = pick([
      'Chef Knife',
      'Cutting Board',
      'Cast Iron Skillet',
      'Mixing Bowl Set',
      'Silicone Spatula Set',
      'Pepper Mill',
      'Kitchen Timer',
      'Measuring Cups',
      'Colander',
      'Garlic Press',
      'Can Opener',
      'Peeler Set',
      'Baking Sheet',
      'Muffin Pan',
      'Rolling Pin',
      'Whisk Set',
      'Tongs',
      'Ladle',
      'Cheese Grater',
      'Bread Knife',
      'Salad Spinner',
      'Rice Cooker',
      'Blender',
      'Coffee Grinder',
      'Toaster',
      'Kettle',
      'Spice Rack',
      'Knife Block',
      'Wok',
      'Dutch Oven',
    ]);
    const material = pick([
      'Stainless Steel',
      'Bamboo',
      'Silicone',
      'Cast Iron',
      'Ceramic',
      'Copper',
      'Wood',
      'BPA-Free Plastic',
    ]);
    const p = rand(499, 9999);
    return {
      name: `${material} ${item}${pick([' Professional', ' Deluxe', ' Classic', ''])}`,
      description: `Premium ${material.toLowerCase()} ${item.toLowerCase()} built for serious home cooks. ${pick(['Dishwasher safe', 'Hand wash only', 'Oven safe to 260°C', 'Freezer safe'])}. ${pick(['Non-stick coating', 'Heat-resistant handles', 'Ergonomic grip', 'Balanced weight'])}. ${pick(['5-year warranty', '10-year warranty', 'Lifetime warranty'])}.`,
      shortDescription: `${material} ${item.toLowerCase()} — kitchen essential`,
      price: p,
      compareAtPrice: Math.random() > 0.4 ? p + rand(300, 4000) : null,
      costPrice: Math.floor(p * 0.35),
      weight: rand(100, 3000),
      sku: `KI-${++skuCounter}`,
      category: kitchenId,
      inventoryQuantity: rand(10, 200),
    };
  });

  // Toys & Games
  const toysId = newCategories[2].id;
  const toysProducts = Array.from({ length: 30 }, () => {
    const item = pick([
      'Board Game',
      'Puzzle 1000pc',
      'Card Game',
      'Building Blocks',
      'Remote Control Car',
      'Stuffed Animal',
      'Science Kit',
      'Art Set',
      'Magnetic Tiles',
      'Play Dough Set',
      'Nerf Blaster',
      'Chess Set',
      'Drone Mini',
      'Marble Run',
      'Train Set',
      'Magic Kit',
      'Kite',
      'Telescope',
      'Microscope',
      "Rubik's Cube",
    ]);
    const age = pick(['3+', '5+', '8+', '10+', '14+', 'All Ages']);
    const p = rand(799, 5999);
    return {
      name: `${pick(['Adventure', 'Discovery', 'Classic', 'Super', 'Mega', 'Wonder'])} ${item}`,
      description: `${item} perfect for ages ${age}. ${pick(['Educational', 'Creative', 'Strategic', 'Action-packed', 'Cooperative'])} gameplay. ${pick(['2-4 players', '1-6 players', 'Solo or multiplayer', 'Family-friendly'])}. ${pick(['Award-winning', 'Bestseller', 'New release', 'Classic favorite'])}. ${pick(['Includes instructions in 5 languages', 'Made from recycled materials', 'Battery included', 'No batteries needed'])}.`,
      shortDescription: `${item} — ages ${age}`,
      price: p,
      compareAtPrice: Math.random() > 0.5 ? p + rand(500, 2000) : null,
      costPrice: Math.floor(p * 0.3),
      weight: rand(200, 2000),
      sku: `TG-${++skuCounter}`,
      category: toysId,
      inventoryQuantity: rand(10, 300),
    };
  });

  // Health & Beauty
  const healthId = newCategories[3].id;
  const healthProducts = Array.from({ length: 30 }, () => {
    const item = pick([
      'Face Moisturizer',
      'Sunscreen SPF50',
      'Lip Balm Set',
      'Hair Oil',
      'Body Lotion',
      'Hand Cream',
      'Face Serum',
      'Sheet Mask Pack',
      'Deodorant',
      'Shampoo Bar',
      'Beard Oil',
      'Nail Care Kit',
      'Eye Cream',
      'Toner',
      'Body Scrub',
      'Perfume',
      'Essential Oil Set',
      'Vitamin C Serum',
      'Retinol Cream',
      'Micellar Water',
    ]);
    const brand = pick([
      'Glow Lab',
      'Pure Botanics',
      'Skin Theory',
      'Zen Beauty',
      'Natur',
      'Evergreen',
    ]);
    const p = rand(499, 4999);
    return {
      name: `${brand} ${item}`,
      description: `${brand} ${item} — ${pick(['100% natural', 'organic certified', 'vegan & cruelty-free', 'dermatologically tested', 'fragrance-free'])}. ${pick(['With hyaluronic acid', 'Enriched with vitamin E', 'Contains niacinamide', 'With aloe vera', 'Retinol-infused'])}. ${pick(['50ml', '100ml', '200ml', '250ml'])} bottle. ${pick(['Morning routine', 'Night routine', 'Daily use', 'Weekly treatment'])}.`,
      shortDescription: `${brand} ${item.toLowerCase()} — natural care`,
      price: p,
      compareAtPrice: Math.random() > 0.5 ? p + rand(300, 2000) : null,
      costPrice: Math.floor(p * 0.25),
      weight: rand(50, 500),
      sku: `HB-${++skuCounter}`,
      category: healthId,
      inventoryQuantity: rand(20, 300),
    };
  });

  // Office & Stationery
  const officeId = newCategories[4].id;
  const officeProducts = Array.from({ length: 30 }, () => {
    const item = pick([
      'Notebook A5',
      'Gel Pen Set',
      'Desk Organizer',
      'Monitor Stand',
      'Desk Pad',
      'Sticky Notes Set',
      'Fountain Pen',
      'Washi Tape Set',
      'Planner 2026',
      'Mechanical Pencil',
      'Highlighter Set',
      'Paper Clips Box',
      'Stapler',
      'Letter Opener',
      'Pencil Case',
      'Desk Lamp',
      'Cable Organizer',
      'Whiteboard',
      'Cork Board',
      'Binder Clips Set',
      'Eraser Set',
      'Ruler Set',
      'Scissors',
      'Glue Set',
      'Index Cards',
      'File Folders',
      'Label Maker',
      'Stamp Set',
      'Ink Pad Set',
      'Calligraphy Set',
    ]);
    const p = rand(299, 3999);
    return {
      name: `${pick(['Premium', 'Essential', 'Professional', 'Creative', 'Minimal'])} ${item}`,
      description: `High-quality ${item.toLowerCase()} for your workspace. ${pick(['Made in Germany', 'Japanese quality', 'Italian craftsmanship', 'Scandinavian design'])}. ${pick(['Archival quality', 'Acid-free', 'Eco-friendly', 'Refillable'])}. ${pick(['Perfect for journaling', 'Ideal for office use', 'Great for students', 'Designed for professionals'])}.`,
      shortDescription: `${item} — professional quality`,
      price: p,
      compareAtPrice: Math.random() > 0.6 ? p + rand(200, 1500) : null,
      costPrice: Math.floor(p * 0.3),
      weight: rand(30, 1000),
      sku: `OF-${++skuCounter}`,
      category: officeId,
      inventoryQuantity: rand(20, 500),
    };
  });

  // Automotive
  const autoId = newCategories[5].id;
  const autoProducts = Array.from({ length: 25 }, () => {
    const item = pick([
      'Car Phone Mount',
      'Dash Cam',
      'Seat Cover Set',
      'Trunk Organizer',
      'Steering Wheel Cover',
      'Air Freshener Set',
      'Jump Starter',
      'Tire Inflator',
      'Car Vacuum',
      'Sun Shade',
      'Floor Mats',
      'LED Interior Lights',
      'USB Car Charger',
      'Blind Spot Mirror',
      'Car Wash Kit',
      'Microfiber Cloth Set',
      'Ice Scraper',
      'Emergency Kit',
      'Roof Rack',
      'Bike Rack',
      'Car Cover',
      'Wax Kit',
      'Paint Pen Set',
      'Headlight Restore Kit',
      'OBD2 Scanner',
    ]);
    const p = rand(699, 9999);
    return {
      name: `${pick(['Pro', 'Auto', 'Drive', 'Road', 'Turbo'])} ${item}`,
      description: `Premium ${item.toLowerCase()} for your vehicle. ${pick(['Universal fit', 'Custom fit available', 'Fits most vehicles', 'Adjustable mounting'])}. ${pick(['Easy installation', 'No tools required', 'Includes mounting kit', 'Plug & play'])}. ${pick(['12V compatible', 'Weatherproof', 'UV resistant', 'Anti-slip backing'])}.`,
      shortDescription: `${item} — universal fit`,
      price: p,
      compareAtPrice: Math.random() > 0.5 ? p + rand(500, 3000) : null,
      costPrice: Math.floor(p * 0.3),
      weight: rand(100, 3000),
      sku: `AU-${++skuCounter}`,
      category: autoId,
      inventoryQuantity: rand(10, 150),
    };
  });

  // Pet Supplies
  const petId = newCategories[6].id;
  const petProducts = Array.from({ length: 25 }, () => {
    const animal = pick(['Dog', 'Cat', 'Pet']);
    const item = pick([
      'Bed',
      'Bowl Set',
      'Collar',
      'Leash',
      'Toy Set',
      'Grooming Kit',
      'Carrier',
      'Treat Pouch',
      'Food Dispenser',
      'Water Fountain',
      'Scratching Post',
      'Harness',
      'Poop Bag Holder',
      'Dental Chew Set',
      'Training Clicker',
      'ID Tag',
      'Brush',
      'Shampoo',
      'Nail Clipper',
      'Cooling Mat',
    ]);
    const p = rand(499, 6999);
    return {
      name: `${animal} ${item}${pick([' Deluxe', ' Premium', ' Basic', ' XL', ''])}`,
      description: `${item} designed specifically for ${animal.toLowerCase()}s. ${pick(['Durable nylon', 'Soft plush', 'BPA-free', 'Stainless steel', 'Natural rubber'])} construction. ${pick(['Machine washable', 'Easy to clean', 'Dishwasher safe', 'Wipe clean'])}. ${pick(['Veterinarian approved', 'Non-toxic materials', 'CPSIA certified', 'Eco-friendly'])}.`,
      shortDescription: `${animal} ${item.toLowerCase()} — safe & durable`,
      price: p,
      compareAtPrice: Math.random() > 0.5 ? p + rand(300, 2000) : null,
      costPrice: Math.floor(p * 0.3),
      weight: rand(50, 3000),
      sku: `PT-${++skuCounter}`,
      category: petId,
      inventoryQuantity: rand(10, 200),
    };
  });

  // Music & Instruments
  const musicId = newCategories[7].id;
  const musicProducts = Array.from({ length: 25 }, () => {
    const item = pick([
      'Acoustic Guitar',
      'Ukulele',
      'Keyboard 61-Key',
      'Drum Pad',
      'Microphone',
      'Guitar Strings Set',
      'Capo',
      'Guitar Picks Set',
      'Music Stand',
      'Metronome',
      'Tuner',
      'Harmonica',
      'Kalimba',
      'Recorder',
      'Bongo Drums',
      'Tambourine',
      'Violin Bow',
      'Trumpet Mouthpiece',
      'Drumsticks Pair',
      'Audio Interface',
      'MIDI Controller',
      'Headphone Amp',
      'Guitar Strap',
      'Pedalboard',
      'Sheet Music Book',
    ]);
    const p = rand(499, 29999);
    return {
      name: `${pick(['Harmony', 'Sonata', 'Rhythm', 'Melody', 'Opus'])} ${item}`,
      description: `${item} for musicians of all levels. ${pick(['Handcrafted', 'Professional-grade', 'Studio-quality', 'Beginner-friendly'])}. ${pick(['Spruce top', 'Mahogany body', 'Maple neck', 'Rosewood fretboard', 'High-quality components'])}. ${pick(['Includes gig bag', 'Comes with case', 'Accessories included', 'Extra strings included'])}.`,
      shortDescription: `${item} — great tone & playability`,
      price: p,
      compareAtPrice: Math.random() > 0.5 ? p + rand(1000, 10000) : null,
      costPrice: Math.floor(p * 0.4),
      weight: rand(100, 5000),
      sku: `MU-${++skuCounter}`,
      category: musicId,
      inventoryQuantity: rand(3, 50),
    };
  });

  products.push(
    ...electronicsProducts,
    ...clothingProducts,
    ...homeProducts,
    ...bookProducts,
    ...sportsProducts,
    ...kitchenProducts,
    ...toysProducts,
    ...healthProducts,
    ...officeProducts,
    ...autoProducts,
    ...petProducts,
    ...musicProducts,
  );

  return products;
}

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Insert new categories
    for (const cat of newCategories) {
      await client.query(
        'INSERT INTO categories (id, name, slug) VALUES ($1, $2, $3) ON CONFLICT (slug) DO NOTHING',
        [cat.id, cat.name, cat.slug],
      );
    }
    console.log(`✓ ${newCategories.length} new categories created`);

    // Generate products
    const products = generateProducts();
    console.log(`Inserting ${products.length} products...`);

    let inserted = 0;
    const usedSlugs = new Set<string>();

    for (const p of products) {
      let s = slug(p.name);
      // Ensure unique slug
      let attempt = 0;
      while (usedSlugs.has(s)) {
        attempt++;
        s = slug(p.name) + '-' + attempt;
      }
      usedSlugs.add(s);

      const id = randomUUID();
      // Randomize created_at over the last 90 days for realistic data
      const daysAgo = Math.floor(Math.random() * 90);
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      await client.query(
        `INSERT INTO products (id, name, slug, description, short_description, sku, status, price, compare_at_price, cost_price, currency, track_inventory, inventory_quantity, weight, weight_unit, meta_title, meta_description, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, $9, 'EUR', true, $10, $11, 'g', $12, $13, $14, $14)`,
        [
          id,
          p.name,
          s,
          p.description,
          p.shortDescription,
          p.sku,
          p.price,
          p.compareAtPrice,
          p.costPrice,
          p.inventoryQuantity,
          p.weight,
          p.metaTitle || p.name,
          p.metaDescription || p.shortDescription,
          createdAt,
        ],
      );

      // Link to category
      await client.query(
        'INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2)',
        [id, p.category],
      );

      inserted++;
      if (inserted % 50 === 0) {
        console.log(`  ${inserted}/${products.length}...`);
      }
    }

    await client.query('COMMIT');
    console.log(
      `\n✅ Done! ${inserted} products inserted across ${4 + newCategories.length} categories.`,
    );

    // Show category counts
    const res = await client.query(`
      SELECT c.name, COUNT(pc.product_id) as count
      FROM categories c
      LEFT JOIN product_categories pc ON pc.category_id = c.id
      GROUP BY c.name ORDER BY count DESC
    `);
    console.log('\nProducts per category:');
    for (const row of res.rows) {
      console.log(`  ${row.name}: ${row.count}`);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);
