import { create } from 'zustand';

interface Mapping {
  partner_attribute: string;
  description: string;
  sample_value: string;
  suggested_mapping: any;
  confidence: number;
  status: 'high' | 'medium' | 'low';
  warnings: string[];
  ai_reasoning: string;
}

interface MappingState {
  mappingId: string | null;
  mappings: Mapping[];
  isGenerating: boolean;
  configurationMethod: 'browse' | 'upload' | 'manual' | null;
  workflowStatus: 'draft' | 'pending' | 'approved' | null;
  setMappings: (mappingId: string, mappings: Mapping[]) => void;
  updateMapping: (index: number, updatedMapping: Partial<Mapping>) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setConfigurationMethod: (method: 'browse' | 'upload' | 'manual') => void;
  setWorkflowStatus: (status: 'draft' | 'pending' | 'approved') => void;
  resetMappings: () => void;
}

export const useMappingStore = create<MappingState>((set) => ({
  mappingId: null,
  mappings: [],
  isGenerating: false,
  configurationMethod: null,
  workflowStatus: null,
  setMappings: (mappingId, mappings) => set({ 
    mappingId, 
    mappings, 
    workflowStatus: 'draft' 
  }),
  updateMapping: (index, updatedMapping) => set((state) => {
    const newMappings = [...state.mappings];
    newMappings[index] = { ...newMappings[index], ...updatedMapping };
    return { mappings: newMappings };
  }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setConfigurationMethod: (method) => set({ configurationMethod: method }),
  setWorkflowStatus: (status) => set({ workflowStatus: status }),
  resetMappings: () => set({ mappings: [], mappingId: null, workflowStatus: null, configurationMethod: null }),
}));
