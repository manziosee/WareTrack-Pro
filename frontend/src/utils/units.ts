export const unitCategories = {
  basic: {
    label: 'Basic Units',
    units: [
      { value: 'pcs', label: 'pcs - pieces' },
      { value: 'pkt', label: 'pkt - packet' },
      { value: 'box', label: 'box - box' },
      { value: 'ctn', label: 'ctn - carton' },
      { value: 'doz', label: 'doz - dozen (12 pcs)' },
      { value: 'pair', label: 'pair - pair (shoes, gloves)' },
    ]
  },
  weight: {
    label: 'Weight-Based Units',
    units: [
      { value: 'kg', label: 'kg - kilogram' },
      { value: 'g', label: 'g - gram' },
      { value: 'mg', label: 'mg - milligram' },
      { value: 'ton', label: 'ton - metric ton' },
    ]
  },
  volume: {
    label: 'Volume-Based Units',
    units: [
      { value: 'L', label: 'L - liter' },
      { value: 'ml', label: 'ml - milliliter' },
      { value: 'gal', label: 'gal - gallon' },
      { value: 'm³', label: 'm³ - cubic meter' },
    ]
  },
  length: {
    label: 'Length-Based Units',
    units: [
      { value: 'm', label: 'm - meter' },
      { value: 'cm', label: 'cm - centimeter' },
      { value: 'mm', label: 'mm - millimeter' },
      { value: 'ft', label: 'ft - foot' },
    ]
  },
  special: {
    label: 'Special Units',
    units: [
      { value: 'roll', label: 'roll - fabrics, cables, paper' },
      { value: 'sheet', label: 'sheet - metals, wood, paper' },
      { value: 'set', label: 'set - tools, electronics, kits' },
      { value: 'bundle', label: 'bundle - construction materials' },
      { value: 'tube', label: 'tube - cosmetics, glue' },
      { value: 'bottle', label: 'bottle - liquids' },
      { value: 'can', label: 'can - paint, food items' },
      { value: 'sack', label: 'sack - flour, cement, rice' },
    ]
  }
};

export const getAllUnits = () => {
  return Object.values(unitCategories).flatMap(category => category.units);
};

export const getUnitsByCategory = (categoryKey: string) => {
  return unitCategories[categoryKey as keyof typeof unitCategories]?.units || [];
};