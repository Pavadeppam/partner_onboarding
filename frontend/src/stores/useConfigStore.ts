import { create } from 'zustand';

interface BusinessContext {
  partnerName: string;
  partnerId: string;
  businessModel: string;
  department: string;
  category: string;
  season: string;
  region: string;
}

interface ConfigState {
  metadata: {
    businessModels: any[];
    businessUnits: any[];
    categories: any[];
    seasons: any[];
    regions: any[];
    workflowStages: any[];
    attributeCatalog: any[];
  };
  businessContext: BusinessContext;
  setMetadata: (metadata: any) => void;
  setBusinessContext: (context: Partial<BusinessContext>) => void;
}

export const useConfigStore = create<ConfigState>((set) => ({
  metadata: {
    businessModels: [],
    businessUnits: [],
    categories: [],
    seasons: [],
    regions: [],
    workflowStages: [],
    attributeCatalog: [],
  },
  businessContext: {
    partnerName: '',
    partnerId: '',
    businessModel: '',
    department: '',
    category: '',
    season: '',
    region: '',
  },
  setMetadata: (metadata) => set((state) => ({ 
    metadata: { ...state.metadata, ...metadata } 
  })),
  setBusinessContext: (context) => set((state) => ({ 
    businessContext: { ...state.businessContext, ...context } 
  })),
}));
