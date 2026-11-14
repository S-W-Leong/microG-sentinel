export interface Nutrients {
  energyKcal: number | null;
  proteinG: number | null;
  sodiumMg: number | null;
  calciumMg: number | null;
  vitaminDIu: number | null;
  fibreG: number | null;
}

export interface MenuItem {
  id: string;
  name: string;
  ingredients: string;
  allergens: string[];
  per100g: Nutrients;
  source: string;
}

const source = 'Simulated · local-menu-v1 · per 100 g · not USDA or an operational ISS recipe';

export const menu: readonly MenuItem[] = [
  {
    id: 'sim-shrimp-rice',
    name: 'Shrimp rice',
    ingredients: 'Rice, shrimp, peas, oil, salt',
    allergens: ['shellfish'],
    per100g: {
      energyKcal: 150,
      proteinG: 8,
      sodiumMg: 350,
      calciumMg: 40,
      vitaminDIu: 8,
      fibreG: 1.5,
    },
    source,
  },
  {
    id: 'sim-oats',
    name: 'Oat porridge',
    ingredients: 'Oats, milk, water',
    allergens: ['milk'],
    per100g: {
      energyKcal: 90,
      proteinG: 4,
      sodiumMg: 55,
      calciumMg: 110,
      vitaminDIu: 40,
      fibreG: 2,
    },
    source,
  },
  {
    id: 'sim-lentils',
    name: 'Lentil stew',
    ingredients: 'Lentils, tomato, carrot, water, salt',
    allergens: [],
    per100g: {
      energyKcal: 110,
      proteinG: 7,
      sodiumMg: 240,
      calciumMg: 30,
      vitaminDIu: 0,
      fibreG: 5,
    },
    source,
  },
  {
    id: 'sim-fruit',
    name: 'Fruit mix',
    ingredients: 'Apple, peach, pear',
    allergens: [],
    per100g: {
      energyKcal: 60,
      proteinG: 0.5,
      sodiumMg: 2,
      calciumMg: 10,
      vitaminDIu: null,
      fibreG: 2.5,
    },
    source,
  },
];
