export type CargoType = 
  | 'geral' 
  | 'granel_solido' 
  | 'granel_liquido' 
  | 'frigorificada' 
  | 'perigosa' 
  | 'neogranel';

export type Axles = 2 | 3 | 4 | 5 | 6 | 7 | 9;

export interface Coefficients {
  ccd: number; // R$/km
  cc: number;  // R$
}

// Valores aproximados baseados nas atualizações recentes da ANTT (2024)
// Estes valores são simulações para fins de demonstração da calculadora.
export const anttTables: Record<CargoType, Record<Axles, Coefficients>> = {
  geral: {
    2: { ccd: 3.10, cc: 120.50 },
    3: { ccd: 3.85, cc: 160.00 },
    4: { ccd: 4.60, cc: 210.20 },
    5: { ccd: 5.40, cc: 260.80 },
    6: { ccd: 6.20, cc: 315.00 },
    7: { ccd: 6.95, cc: 365.40 },
    9: { ccd: 8.10, cc: 450.00 }
  },
  granel_solido: {
    2: { ccd: 3.25, cc: 130.00 },
    3: { ccd: 4.00, cc: 175.50 },
    4: { ccd: 4.80, cc: 230.00 },
    5: { ccd: 5.65, cc: 285.00 },
    6: { ccd: 6.50, cc: 345.00 },
    7: { ccd: 7.30, cc: 400.00 },
    9: { ccd: 8.50, cc: 490.00 }
  },
  granel_liquido: {
    2: { ccd: 3.40, cc: 140.00 },
    3: { ccd: 4.20, cc: 190.00 },
    4: { ccd: 5.05, cc: 250.00 },
    5: { ccd: 5.95, cc: 310.00 },
    6: { ccd: 6.85, cc: 375.00 },
    7: { ccd: 7.70, cc: 435.00 },
    9: { ccd: 8.95, cc: 535.00 }
  },
  frigorificada: {
    2: { ccd: 3.70, cc: 160.00 },
    3: { ccd: 4.55, cc: 215.00 },
    4: { ccd: 5.45, cc: 280.00 },
    5: { ccd: 6.40, cc: 350.00 },
    6: { ccd: 7.35, cc: 420.00 },
    7: { ccd: 8.25, cc: 490.00 },
    9: { ccd: 9.60, cc: 600.00 }
  },
  perigosa: {
    2: { ccd: 3.85, cc: 170.00 },
    3: { ccd: 4.75, cc: 230.00 },
    4: { ccd: 5.70, cc: 300.00 },
    5: { ccd: 6.70, cc: 375.00 },
    6: { ccd: 7.70, cc: 450.00 },
    7: { ccd: 8.65, cc: 525.00 },
    9: { ccd: 10.05, cc: 640.00 }
  },
  neogranel: {
    2: { ccd: 3.00, cc: 110.00 },
    3: { ccd: 3.70, cc: 150.00 },
    4: { ccd: 4.45, cc: 195.00 },
    5: { ccd: 5.20, cc: 245.00 },
    6: { ccd: 6.00, cc: 295.00 },
    7: { ccd: 6.75, cc: 345.00 },
    9: { ccd: 7.85, cc: 425.00 }
  }
};

export const cargoLabels: Record<CargoType, string> = {
  geral: 'Carga Geral',
  granel_solido: 'Granel Sólido',
  granel_liquido: 'Granel Líquido',
  frigorificada: 'Carga Frigorificada',
  perigosa: 'Carga Perigosa',
  neogranel: 'Neogranel'
};

export const calculateFreight = (
  distance: number,
  cargoType: CargoType,
  axles: Axles,
  returnEmpty: boolean,
  tolls: number
) => {
  const coefs = anttTables[cargoType][axles];
  
  // Se o retorno for vazio, a distância considerada para o deslocamento é dobrada (ida e volta)
  // ou aplica-se uma regra específica. Na prática comum da ANTT, cobra-se o deslocamento do retorno.
  const effectiveDistance = returnEmpty ? distance * 2 : distance;
  
  const displacementCost = effectiveDistance * coefs.ccd;
  const loadingUnloadingCost = coefs.cc;
  
  const baseFreight = displacementCost + loadingUnloadingCost;
  const totalFreight = baseFreight + tolls;
  
  return {
    displacementCost,
    loadingUnloadingCost,
    baseFreight,
    tolls,
    totalFreight,
    costPerKm: totalFreight / distance // Custo por km rodado carregado
  };
};
