"use client";

import React, { useState } from 'react';
import { useConfigStore } from '@/stores/useConfigStore';
import { useMappingStore } from '@/stores/useMappingStore';
import { MetadataAccordion } from '@/components/MetadataAccordion';
import { DynamicTable } from '@/components/DynamicTable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Sparkles, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight,
  ChevronDown,
  Info,
  BrainCircuit,
  ShieldCheck,
  Search,
  ArrowLeft,
  Building2,
  Tag,
  Calendar,
  Globe,
  Briefcase,
  MousePointer2,
  Plus,
  Trash2
} from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export default function WorkspacePage() {
  const router = useRouter();
  const { metadata, businessContext, setMetadata } = useConfigStore();
  const { mappings, mappingId, setMappings, isGenerating, setIsGenerating, configurationMethod, workflowStatus } = useMappingStore();
  
  // Initialize selected IDs from existing mappings
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<string[]>(() => 
    mappings.map(m => m.suggested_mapping?.id).filter(Boolean)
  );

  // Sync selected IDs when mappings change (e.g., after approval or removal)
   React.useEffect(() => {
     const mappedIds = mappings.map(m => m.suggested_mapping?.id).filter(Boolean);
     setSelectedCatalogIds(prev => {
       const combined = Array.from(new Set([...prev, ...mappedIds]));
       return combined;
     });
   }, [mappings]);
 
   // Helper to get label from metadata
   const getLabel = (list: any[], id: string) => list.find(item => item.id === id)?.label || id;

   const contextItems = [
     { label: 'Business Model', value: getLabel(metadata.businessModels, businessContext.businessModel), icon: <Briefcase className="w-3.5 h-3.5" /> },
     { label: 'Business Unit', value: getLabel(metadata.businessUnits, businessContext.department), icon: <Building2 className="w-3.5 h-3.5" /> },
     { label: 'Category', value: getLabel(metadata.categories, businessContext.category), icon: <Tag className="w-3.5 h-3.5" /> },
     { label: 'Season', value: getLabel(metadata.seasons, businessContext.season), icon: <Calendar className="w-3.5 h-3.5" /> },
     { label: 'Region', value: getLabel(metadata.regions, businessContext.region), icon: <Globe className="w-3.5 h-3.5" /> },
   ];

  const [manualAttributes, setManualAttributes] = useState(() => 
    mappings.length > 0 
      ? mappings.map(m => ({ 
          name: m.partner_attribute, 
          description: m.description || '', 
          sampleValue: m.sample_value || '' 
        }))
      : [{ name: '', description: '', sampleValue: '' }]
  );

  // Sync manual attributes when entering manual mode if mappings exist
  React.useEffect(() => {
    if (configurationMethod === 'manual' && mappings.length > 0 && manualAttributes.every(a => !a.name)) {
      setManualAttributes(mappings.map(m => ({ 
        name: m.partner_attribute, 
        description: m.description || '', 
        sampleValue: m.sample_value || '' 
      })));
    }
  }, [configurationMethod, mappings]);

  const [isAddingCanonical, setIsAddingCanonical] = useState(false);
  const [newCanonicalAttr, setNewCanonicalAttr] = useState({ label: '', group: 'Selling Attributes', description: '', example: '', type: 'string', mandatory: false });

  const handleAddManualRow = () => {
    setManualAttributes([...manualAttributes, { name: '', description: '', sampleValue: '' }]);
  };

  const handleRemoveManualRow = (index: number) => {
    const newAttrs = manualAttributes.filter((_, i) => i !== index);
    setManualAttributes(newAttrs.length > 0 ? newAttrs : [{ name: '', description: '', sampleValue: '' }]);
  };

  const handleAddMissingMandatory = () => {
    const mandatoryFields = metadata.attributeCatalog.flatMap((g: any) => 
      g.attributes.filter((a: any) => a.mandatory)
    );
    const existingNames = manualAttributes.map(a => a.name.toLowerCase());
    const missingMandatory = mandatoryFields
      .filter(f => !mappings.some(m => m.suggested_mapping?.id === f.id))
      .filter(f => !existingNames.includes(f.label.toLowerCase()))
      .map(f => ({ name: f.label, description: f.description, sampleValue: f.example }));

    if (missingMandatory.length > 0) {
      setManualAttributes([...manualAttributes.filter(a => a.name), ...missingMandatory]);
    }
  };

  const handleSaveNewCanonical = () => {
    if (!newCanonicalAttr.label) return;
    
    // In a real app, we would send this to the backend.
    // For POC, we'll update the local state.
    const newId = newCanonicalAttr.label.toLowerCase().replace(/\s+/g, '_');
    const updatedCatalog = [...metadata.attributeCatalog];
    const groupIdx = updatedCatalog.findIndex(g => g.group === newCanonicalAttr.group);
    
    if (groupIdx !== -1) {
      updatedCatalog[groupIdx].attributes.push({
        id: newId,
        ...newCanonicalAttr,
        category: "All"
      });
      setMetadata({ ...metadata, attributeCatalog: updatedCatalog });
    }

    setIsAddingCanonical(false);
    setNewCanonicalAttr({ label: '', group: 'Selling Attributes', description: '', example: '', type: 'string', mandatory: false });
  };

  const filteredCatalog = metadata.attributeCatalog.flatMap((g: any) => 
    g.attributes.map((a: any) => ({ ...a, group: g.group }))
  ).filter((a: any) => {
    if (configurationMethod === 'browse') return true; // Show all in browse mode
    return a.category === "All" || a.category === (metadata.categories.find(c => c.id === businessContext.category)?.label || businessContext.category);
  }).sort((a, b) => {
    const order = ["Product Hierarchy", "Product Core", "Selling Attributes"];
    return order.indexOf(a.group) - order.indexOf(b.group);
  });

  const getGroupForCatalogId = (id: string) => filteredCatalog.find((a: any) => a.id === id)?.group;

  const toggleSelection = (id: string) => {
    setSelectedCatalogIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const browseColumns = [
    {
      id: "select",
      header: ({ table }: any) => (
        <Checkbox
          checked={selectedCatalogIds.length === filteredCatalog.length && filteredCatalog.length > 0}
          onCheckedChange={(value) => {
            if (value) {
              setSelectedCatalogIds(filteredCatalog.map((a: any) => a.id));
            } else {
              setSelectedCatalogIds([]);
            }
          }}
          aria-label="Select all"
        />
      ),
      cell: ({ row }: any) => (
        <Checkbox
          checked={selectedCatalogIds.includes(row.original.id)}
          onCheckedChange={() => toggleSelection(row.original.id)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: "group",
      header: "Attribute Category",
      cell: ({ row }: any) => (
        <Badge variant="outline" className="text-[10px] font-bold text-slate-500 border-slate-200">
          {row.original.group}
        </Badge>
      ),
      enableSorting: true,
      sortingFn: (rowA: any, rowB: any) => {
        const order = ["Product Hierarchy", "Product Core", "Selling Attributes"];
        const indexA = order.indexOf(rowA.original.group);
        const indexB = order.indexOf(rowB.original.group);
        return indexA - indexB;
      },
    },
    {
      accessorKey: "label",
      header: "Attribute Name",
      cell: ({ row }: any) => (
        <span className="font-semibold text-slate-900">{row.original.label}</span>
      ),
      enableSorting: true,
    },
    {
      id: "mapping_status",
      header: "Mapping Status",
      accessorFn: (row: any) => {
        const isMapped = mappings.some(m => m.suggested_mapping?.id === row.id);
        if (!isMapped) return "Not Mapped";
        if (workflowStatus === 'approved') return "FINALIZED";
        if (workflowStatus === 'pending') return "PENDING APPROVAL";
        return "MAPPED";
      },
      cell: ({ row }: any) => {
        const isMapped = mappings.some(m => m.suggested_mapping?.id === row.original.id);
        if (!isMapped) return <span className="text-[10px] text-slate-300 font-medium uppercase tracking-wider italic">Not Mapped</span>;
        
        let badgeColor = "bg-emerald-50 text-emerald-600 border-emerald-100";
        let label = "MAPPED";
        
        if (workflowStatus === 'pending') {
          badgeColor = "bg-amber-50 text-amber-600 border-amber-100";
          label = "PENDING APPROVAL";
        } else if (workflowStatus === 'approved') {
          badgeColor = "bg-emerald-50 text-emerald-600 border-emerald-100";
          label = "FINALIZED";
        }

        return (
          <Badge className={cn(badgeColor, "font-bold text-[10px] gap-1")}>
            <CheckCircle2 className="w-3 h-3" />
            {label}
          </Badge>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }: any) => (
        <span className="text-xs text-slate-500 line-clamp-2 max-w-[300px]">{row.original.description}</span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "example",
      header: "Example",
      cell: ({ row }: any) => (
        <code className="text-[10px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 text-slate-500 font-mono">
          {row.original.example}
        </code>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "type",
      header: "Data Type",
      cell: ({ row }: any) => (
        <code className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 uppercase font-bold">
          {row.original.type}
        </code>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "mandatory",
      header: "Requirement",
      cell: ({ row }: any) => (
        row.original.mandatory ? (
          <Badge className="bg-rose-50 text-rose-600 border-rose-100 font-bold text-[10px]">MANDATORY</Badge>
        ) : (
          <Badge variant="outline" className="text-slate-400 font-medium text-[10px]">OPTIONAL</Badge>
        )
      ),
      enableSorting: false,
    }
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    
    setIsGenerating(true);
    const formData = new FormData();
    formData.append('file', e.target.files[0]);

    try {
      const uploadRes = await axios.post('http://localhost:8001/api/upload', formData);
      const mappingRes = await axios.post('http://localhost:8001/api/generate-mapping', {
        partner_attributes: uploadRes.data.sample_data,
        business_context: businessContext
      });
      
      setMappings(mappingRes.data.mapping_id, mappingRes.data.mappings);
    } catch (error) {
      console.error("Mapping generation failed", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualSubmit = async () => {
    setIsGenerating(true);
    try {
      const mappingRes = await axios.post('http://localhost:8001/api/generate-mapping', {
        partner_attributes: manualAttributes.map(attr => ({
          partner_attribute: attr.name,
          description: attr.description,
          sample_value: attr.sampleValue || "Manual Entry"
        })),
        business_context: businessContext
      });
      setMappings(mappingRes.data.mapping_id, mappingRes.data.mappings);
    } catch (error) {
      console.error("Manual mapping failed", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const columns = [
    {
      id: "expander",
      header: () => null,
      cell: ({ row }: any) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={(e) => {
            e.stopPropagation();
            row.toggleExpanded();
          }}
        >
          {row.getIsExpanded() ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
        </Button>
      ),
    },
    {
      accessorKey: "partner_attribute",
      header: "Partner Attribute",
      cell: ({ row }: any) => (
        <div className="font-medium text-slate-900">{row.original.partner_attribute}</div>
      )
    },
    {
      accessorKey: "sample_value",
      header: "Sample Value",
      cell: ({ row }: any) => (
        <div className="text-slate-500 text-sm truncate max-w-[150px]">{row.original.sample_value}</div>
      )
    },
    {
      accessorKey: "suggested_mapping",
      header: "Internal Attribute",
      cell: ({ row }: any) => {
        const mapping = row.original.suggested_mapping;
        const attributeId = mapping?.id || mapping?.internal_attribute;
        const group =
          mapping?.group ||
          mapping?.metadata?.group ||
          (attributeId ? getGroupForCatalogId(attributeId) : undefined);
        return mapping ? (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-mono">
            {`{"group":"${group || "Unknown"}","attribute":"${attributeId || "Unmapped"}"}`}
          </Badge>
        ) : (
          <span className="text-slate-400 italic text-sm">No match</span>
        );
      }
    },
    {
      accessorKey: "confidence",
      header: "Confidence",
      cell: ({ row }: any) => {
        const conf = row.original.confidence;
        const color = conf > 0.8 ? "bg-emerald-500" : conf > 0.5 ? "bg-amber-500" : "bg-rose-500";
        return (
          <div className="flex items-center gap-2">
            <div className={`h-1.5 w-12 rounded-full bg-slate-100 overflow-hidden`}>
              <div className={`h-full ${color}`} style={{ width: `${conf * 100}%` }} />
            </div>
            <span className="text-xs font-semibold text-slate-600">{(conf * 100).toFixed(0)}%</span>
          </div>
        );
      }
    },
    {
      id: "actions",
      header: "Governance",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-bold text-[10px] uppercase"
            onClick={(e) => {
              e.stopPropagation();
              row.toggleExpanded();
            }}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            Why?
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Context Summary Header */}
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
        <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Change Context
            </Button>
            <Separator orientation="vertical" className="h-4 bg-slate-200" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                {businessContext.partnerName || 'New Partner'}
              </span>
              <Badge variant="outline" className="text-[10px] h-4 bg-white border-slate-200 text-slate-400 font-mono">
                ID: {businessContext.partnerId || 'N/A'}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {contextItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="text-slate-400">
                  {item.icon}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 leading-none">
                    {item.label}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    {item.value || 'Not selected'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-220px)]">
      {/* Left Panel - Attribute Catalog - Hidden in Browse Mode */}
      {configurationMethod !== 'browse' && (
        <div className="col-span-3 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Attribute Catalog</h3>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-blue-600">
              <Search className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1 pr-4">
            <MetadataAccordion 
              data={metadata.attributeCatalog} 
              selectedIds={selectedCatalogIds}
              onToggle={(id) => setSelectedCatalogIds(prev => 
                prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
              )}
            />
          </ScrollArea>
        </div>
      )}

      {/* Center Panel - AI Mapping Table */}
      <div className={cn(
        "flex flex-col gap-4",
        configurationMethod === 'browse' ? "col-span-12" : "col-span-6"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800">
              {configurationMethod === 'browse' ? 'Retailer Attribute Catalog' : 'AI Mapping Workspace'}
            </h3>
            {mappings.length > 0 && (
              <Badge className="bg-blue-600 text-white border-none">{mappings.length} Attributes</Badge>
            )}
          </div>
          <div className="flex gap-2">
            {configurationMethod === 'manual' && mappings.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 border-blue-200 text-blue-600 hover:bg-blue-50 gap-2"
                onClick={() => {
                  setMappings(mappingId || "manual-" + Date.now(), []); // Reset to entry mode
                }}
              >
                <MousePointer2 className="w-4 h-4" />
                Add More Fields
              </Button>
            )}
            <Button 
              size="sm" 
              className="h-9 bg-blue-600 hover:bg-blue-700 gap-2"
              onClick={() => router.push('/review')}
              disabled={mappings.length === 0}
            >
              Review Mapping
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Card className="flex-1 border-slate-200 overflow-hidden flex flex-col">
          {mappings.length > 0 && configurationMethod !== 'browse' ? (
            <div className="flex-1 p-0 overflow-auto">
              <DynamicTable 
                columns={columns} 
                data={mappings} 
                searchKey="partner_attribute"
                renderExpandedRow={(row) => (
                  <div className="p-4 space-y-4 bg-blue-50/30 rounded-lg border border-blue-100">
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-blue-100 rounded-md text-blue-600 shrink-0">
                        <BrainCircuit className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">AI Reasoning & Logic</h4>
                        <p className="text-sm text-slate-600 leading-relaxed italic">
                          "{row.ai_reasoning}"
                        </p>
                      </div>
                    </div>
                    {row.warnings.length > 0 && (
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 bg-rose-100 rounded-md text-rose-600 shrink-0">
                          <AlertCircle className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Governance Warnings</h4>
                          <ul className="list-disc list-inside text-sm text-rose-600">
                            {row.warnings.map((w: string, idx: number) => (
                              <li key={idx}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col p-8">
              {configurationMethod === 'browse' ? (
                <div className="flex-1 flex flex-col space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-bold text-slate-900">Retailer Attribute Catalog</h4>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-[10px] bg-blue-50 text-blue-600 hover:bg-blue-100 gap-1 font-bold uppercase"
                          onClick={() => setIsAddingCanonical(!isAddingCanonical)}
                        >
                          <Tag className="w-3 h-3" />
                          {isAddingCanonical ? 'Cancel' : 'Add Missing Attribute'}
                        </Button>
                      </div>
                      <p className="text-slate-500 text-sm">
                        {businessContext.partnerName && <span className="font-bold text-slate-700 mr-1">{businessContext.partnerName} -</span>}
                        Showing attributes for <span className="text-blue-600 font-semibold">{metadata.categories.find(c => c.id === businessContext.category)?.label || 'General'}</span> category.
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 shadow-sm">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-slate-400 leading-none">Total Selected</span>
                          <span className="text-sm font-bold text-slate-700">{selectedCatalogIds.length}</span>
                        </div>
                        <Separator orientation="vertical" className="h-6 bg-slate-200" />
                        <div className="flex gap-4">
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-blue-500 leading-none">New</span>
                            <span className="text-sm font-bold text-blue-600">
                              {selectedCatalogIds.filter(id => !mappings.some(m => m.suggested_mapping?.id === id)).length}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-emerald-500 leading-none">Mapped</span>
                            <span className="text-sm font-bold text-emerald-600">
                              {selectedCatalogIds.filter(id => mappings.some(m => m.suggested_mapping?.id === id && workflowStatus === 'draft')).length}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-amber-500 leading-none">Pending</span>
                            <span className="text-sm font-bold text-amber-600">
                              {selectedCatalogIds.filter(id => mappings.some(m => m.suggested_mapping?.id === id && workflowStatus === 'pending')).length}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-slate-500 leading-none">Finalized</span>
                            <span className="text-sm font-bold text-slate-600">
                              {selectedCatalogIds.filter(id => mappings.some(m => m.suggested_mapping?.id === id && workflowStatus === 'approved')).length}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-10 px-6 shadow-md shadow-blue-100"
                        onClick={() => {
                          const selectedAttrs = filteredCatalog.filter((a: any) => selectedCatalogIds.includes(a.id));
                          const newMappings = selectedAttrs.map((a: any) => ({
                            partner_attribute: a.label.toUpperCase(),
                            description: a.description,
                            sample_value: a.example,
                            suggested_mapping: { label: a.label, id: a.id, internal_attribute: a.id, group: a.group },
                            confidence: 1.0,
                            status: 'high' as const,
                            warnings: [],
                            ai_reasoning: "Directly selected from the canonical retailer catalog."
                          }));
                          
                          // Merge with existing mappings, avoiding duplicates based on suggested_mapping.id
                          const existingIds = mappings.map(m => m.suggested_mapping?.id);
                          const uniqueNewMappings = newMappings.filter(m => !existingIds.includes(m.suggested_mapping.id));
                          
                          if (uniqueNewMappings.length > 0) {
                            setMappings("browse-" + Date.now(), [...mappings, ...uniqueNewMappings]);
                          }
                        }}
                        disabled={selectedCatalogIds.filter(id => !mappings.some(m => m.suggested_mapping?.id === id)).length === 0}
                      >
                        Add to Mapping
                      </Button>
                    </div>
                  </div>
                  
                  {isAddingCanonical && (
                    <Card className="border-blue-200 bg-blue-50/20 shadow-sm">
                      <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-4 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Attribute Name</label>
                            <Input 
                              placeholder="e.g. Fabric Weight" 
                              className="h-8 text-xs"
                              value={newCanonicalAttr.label}
                              onChange={(e) => setNewCanonicalAttr({...newCanonicalAttr, label: e.target.value})}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Category Group</label>
                            <select 
                              className="w-full h-8 px-3 rounded-md border border-slate-200 bg-white text-xs"
                              value={newCanonicalAttr.group}
                              onChange={(e) => setNewCanonicalAttr({...newCanonicalAttr, group: e.target.value})}
                            >
                              <option>Product Hierarchy</option>
                              <option>Product Core</option>
                              <option>Selling Attributes</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Data Type</label>
                            <select 
                              className="w-full h-8 px-3 rounded-md border border-slate-200 bg-white text-xs"
                              value={newCanonicalAttr.type}
                              onChange={(e) => setNewCanonicalAttr({...newCanonicalAttr, type: e.target.value})}
                            >
                              <option>string</option>
                              <option>number</option>
                              <option>boolean</option>
                              <option>list</option>
                            </select>
                          </div>
                          <div className="flex items-end pb-1.5">
                            <div className="flex items-center gap-2">
                              <Checkbox 
                                id="mandatory" 
                                checked={newCanonicalAttr.mandatory}
                                onCheckedChange={(checked) => setNewCanonicalAttr({...newCanonicalAttr, mandatory: !!checked})}
                              />
                              <label htmlFor="mandatory" className="text-[10px] font-bold text-slate-500 uppercase cursor-pointer">Mandatory</label>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Description</label>
                            <Input 
                              placeholder="Describe the attribute purpose..." 
                              className="h-8 text-xs"
                              value={newCanonicalAttr.description}
                              onChange={(e) => setNewCanonicalAttr({...newCanonicalAttr, description: e.target.value})}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Example Value</label>
                            <Input 
                              placeholder="e.g. 250gsm" 
                              className="h-8 text-xs"
                              value={newCanonicalAttr.example}
                              onChange={(e) => setNewCanonicalAttr({...newCanonicalAttr, example: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-blue-100">
                          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setIsAddingCanonical(false)}>Cancel</Button>
                          <Button size="sm" className="h-8 text-xs bg-blue-600" onClick={handleSaveNewCanonical} disabled={!newCanonicalAttr.label}>
                            Add to Catalog
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex-1 border rounded-lg overflow-hidden bg-white">
                    <DynamicTable 
                      columns={browseColumns} 
                      data={filteredCatalog} 
                      searchKey="label"
                      searchPlaceholder="Search catalog attributes..."
                      groupBy="group"
                      infiniteScroll={true}
                      onRowClick={(row) => toggleSelection(row.id)}
                    />
                  </div>
                </div>
              ) : configurationMethod === 'manual' ? (
                <div className="flex-1 flex flex-col space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-lg font-bold text-slate-900">Manual Attribute Entry</h4>
                      <p className="text-slate-500 text-sm">Define your partner attributes manually for AI mapping.</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50 gap-1 text-[10px] font-bold uppercase" onClick={handleAddMissingMandatory}>
                        <Sparkles className="w-3 h-3" />
                        Add Missing Mandatory
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleAddManualRow}>
                        Add Row
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 border rounded-lg p-4 bg-slate-50/50">
                    <div className="space-y-4">
                      {/* Form Headers */}
                      <div className="grid grid-cols-[1fr_1fr_1fr_40px] gap-4 px-2">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Partner Attribute Name</label>
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Field Description</label>
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Sample Value</label>
                        <div />
                      </div>

                      {manualAttributes.map((attr, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_40px] gap-4 items-center group">
                          <Input 
                            placeholder="e.g. Shade" 
                            className="bg-white border-slate-200 focus:border-blue-300 focus:ring-blue-100"
                            value={attr.name}
                            onChange={(e) => {
                              const newAttrs = [...manualAttributes];
                              newAttrs[idx].name = e.target.value;
                              setManualAttributes(newAttrs);
                            }}
                          />
                          <Input 
                            placeholder="Briefly describe the field..." 
                            className="bg-white border-slate-200"
                            value={attr.description}
                            onChange={(e) => {
                              const newAttrs = [...manualAttributes];
                              newAttrs[idx].description = e.target.value;
                              setManualAttributes(newAttrs);
                            }}
                          />
                          <Input 
                            placeholder="e.g. Midnight Blue" 
                            className="bg-white border-slate-200"
                            value={attr.sampleValue}
                            onChange={(e) => {
                              const newAttrs = [...manualAttributes];
                              newAttrs[idx].sampleValue = e.target.value;
                              setManualAttributes(newAttrs);
                            }}
                          />
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveManualRow(idx)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button 
                        variant="ghost" 
                        className="w-full border-dashed border-2 border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 h-12 gap-2"
                        onClick={handleAddManualRow}
                      >
                        <Plus className="w-4 h-4" />
                        Add New Record Field
                      </Button>
                    </div>
                  </ScrollArea>
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
                    onClick={handleManualSubmit}
                    disabled={manualAttributes.some(a => !a.name) || isGenerating}
                  >
                    {isGenerating ? <Sparkles className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
                    {isGenerating ? 'AI is generating mapping...' : 'Generate AI Mapping'}
                  </Button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center">
                    <BrainCircuit className="w-10 h-10 text-blue-600" />
                  </div>
                  <div className="space-y-2 max-w-sm">
                    <h4 className="text-xl font-bold text-slate-900">Start AI Onboarding</h4>
                    <p className="text-slate-500 text-sm">Upload your partner product feed and our AI will automatically map attributes to your catalog.</p>
                  </div>
                  <div className="flex flex-col items-center gap-4 w-full max-w-xs">
                    <label className="w-full">
                      <Input type="file" className="hidden" onChange={handleFileUpload} accept=".csv,.xlsx" />
                      <div className="flex items-center justify-center gap-2 w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer font-semibold shadow-lg shadow-blue-200 transition-all">
                        {isGenerating ? (
                          <Sparkles className="w-5 h-5 animate-spin" />
                        ) : (
                          <Upload className="w-5 h-5" />
                        )}
                        {isGenerating ? 'AI is thinking...' : 'Upload Product Feed'}
                      </div>
                    </label>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Supported formats: CSV, XLSX, JSON</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Right Panel - AI Assistant Panel */}
      {configurationMethod !== 'browse' && (
        <div className="col-span-3 flex flex-col gap-6">
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wider">AI Assistant Insights</h3>
            </div>
            
            <Card className="border-blue-100 bg-blue-50/50">
              <CardContent className="p-4 space-y-4">
                {mappings.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-800">High Confidence Matches</p>
                        <p className="text-xs text-slate-600">AI mapped 12 attributes with &gt;90% accuracy based on historical partner patterns.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-800">Action Required</p>
                        <p className="text-xs text-slate-600">3 attributes require manual review due to ambiguous semantic overlaps.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-800">Rule Validation</p>
                        <p className="text-xs text-slate-600">Business rules suggest "Sustainability Rating" should map to "ESG_SCORE".</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-8 text-center space-y-3">
                    <Info className="w-8 h-8 text-blue-300" />
                    <p className="text-xs text-slate-500 italic">Waiting for data upload to provide intelligent mapping recommendations.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wider">Missing Mandatory Fields</h3>
            <div className="space-y-2">
              {metadata.attributeCatalog.flatMap((g: any) => g.attributes)
                .filter((a: any) => a.mandatory)
                .slice(0, 4)
                .map((attr: any) => (
                  <div key={attr.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-white">
                    <span className="text-xs font-medium text-slate-600">{attr.label}</span>
                    <Badge variant="outline" className="text-[10px] h-4 border-slate-200 text-slate-400">MISSING</Badge>
                  </div>
                ))}
            </div>
          </section>

          <div className="mt-auto">
            <Card className="bg-slate-900 text-white border-none overflow-hidden relative">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <h4 className="font-bold">Explainable AI</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">Our similarity engine uses SLM (Small Language Models) to understand context beyond keyword matching.</p>
                </div>
                <Button variant="outline" className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs h-8">
                  View Decision Matrix
                </Button>
              </CardContent>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-600/20 rounded-full blur-2xl" />
            </Card>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
