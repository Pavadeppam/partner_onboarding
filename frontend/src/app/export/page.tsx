"use client";

import React, { useState } from 'react';
import { useConfigStore } from '@/stores/useConfigStore';
import { useMappingStore } from '@/stores/useMappingStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileJson, 
  FileSpreadsheet, 
  FileCode, 
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Tag,
  Briefcase,
  ExternalLink,
  Info
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function ExportPage() {
  const router = useRouter();
  const { metadata, businessContext } = useConfigStore();
  const { mappings, workflowStatus } = useMappingStore();
  const [isExporting, setIsExporting] = useState<{ id: string, type: 'catalog' | 'mapping' } | null>(null);

  // Helper to get label from metadata
  const getLabel = (list: any[], id: string) => list.find(item => item.id === id)?.label || id;

  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleExport = (format: 'json' | 'csv' | 'xml', type: 'catalog' | 'mapping') => {
    setIsExporting({ id: format, type });
    
    let exportData: any[] = [];
    let fileName = "";

    if (type === 'mapping') {
      exportData = mappings.map(m => ({
        partner_field: m.partner_attribute,
        ...(format === 'json' ? {
          internal_field: {
            group: m.suggested_mapping?.group || m.suggested_mapping?.metadata?.group || "Unknown",
            attribute: m.suggested_mapping?.id || m.suggested_mapping?.internal_attribute || "Unmapped"
          }
        } : {
          internal_group: m.suggested_mapping?.group || m.suggested_mapping?.metadata?.group || "Unknown",
          internal_attribute: m.suggested_mapping?.id || m.suggested_mapping?.internal_attribute || "Unmapped"
        }),
        confidence: `${(m.confidence * 100).toFixed(0)}%`,
        status: m.status.toUpperCase()
      }));
      fileName = `mapping_export_${businessContext.partnerId || 'new'}`;
    } else {
      exportData = metadata.attributeCatalog.flatMap((g: any) => 
        g.attributes.map((a: any) => ({
          category: g.group,
          attribute_id: a.id,
          attribute_name: a.label,
          type: a.type,
          mandatory: a.mandatory ? "Yes" : "No",
          description: a.description
        }))
      );
      fileName = `retailer_attribute_catalog`;
    }

    setTimeout(() => {
      if (format === 'json') {
        const jsonString = JSON.stringify({
          type: type === 'mapping' ? "MAPPING_SPECIFICATION" : "RETAILER_CATALOG",
          context: type === 'mapping' ? businessContext : undefined,
          data: exportData,
          exported_at: new Date().toISOString(),
          status: type === 'mapping' ? "APPROVED" : "ACTIVE"
        }, null, 2);
        downloadFile(jsonString, `${fileName}.json`, "application/json");
      } else if (format === 'csv') {
        const headers = type === 'mapping' 
          ? ["Partner Field", "Internal Group", "Internal Attribute", "Confidence", "Status"]
          : ["Category", "Attribute ID", "Attribute Name", "Type", "Mandatory", "Description"];
        
        const rows = exportData.map(d => Object.values(d).map(v => `"${v}"`).join(","));
        const csvString = [headers.join(","), ...rows].join("\n");
        downloadFile(csvString, `${fileName}.csv`, "text/csv");
      } else if (format === 'xml') {
        let xmlString = `<?xml version="1.0" encoding="UTF-8"?>\n<${type === 'mapping' ? 'mapping_specification' : 'retailer_catalog'}>\n`;
        xmlString += `  <metadata>\n    <exported_at>${new Date().toISOString()}</exported_at>\n    <status>${type === 'mapping' ? 'APPROVED' : 'ACTIVE'}</status>\n  </metadata>\n`;
        xmlString += `  <items>\n`;
        exportData.forEach(d => {
          xmlString += `    <item>\n`;
          Object.entries(d).forEach(([key, value]) => {
            xmlString += `      <${key}>${value}</${key}>\n`;
          });
          xmlString += `    </item>\n`;
        });
        xmlString += `  </items>\n</${type === 'mapping' ? 'mapping_specification' : 'retailer_catalog'}>`;
        downloadFile(xmlString, `${fileName}.xml`, "application/xml");
      }
      setIsExporting(null);
    }, 800);
  };

  const formats = [
    { 
      id: 'json', 
      name: 'JSON Data', 
      desc: 'Machine-readable format for system integration.', 
      icon: <FileJson className="w-6 h-6 text-amber-500" />,
      color: 'hover:border-amber-200 hover:bg-amber-50/30'
    },
    { 
      id: 'csv', 
      name: 'CSV Spreadsheet', 
      desc: 'Standard table format for Excel or Google Sheets.', 
      icon: <FileSpreadsheet className="w-6 h-6 text-emerald-500" />,
      color: 'hover:border-emerald-200 hover:bg-emerald-50/30'
    },
    { 
      id: 'xml', 
      name: 'XML Schema', 
      desc: 'Hierarchical format for enterprise legacy systems.', 
      icon: <FileCode className="w-6 h-6 text-blue-500" />,
      color: 'hover:border-blue-200 hover:bg-blue-50/30'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Export Center</h1>
            <p className="text-sm text-slate-500">Download canonical catalogs or finalized mapping specifications.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12">
        {/* Section 1: Retailer Attribute Catalog */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Retailer Attribute Catalog</h2>
                <p className="text-sm text-slate-500">Download the full dictionary of canonical retail attributes.</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {metadata.attributeCatalog.reduce((acc: number, g: any) => acc + g.attributes.length, 0)} Attributes
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {formats.map((f) => (
              <Card 
                key={`catalog-${f.id}`} 
                className={cn(
                  "border-slate-200 cursor-pointer transition-all duration-200 shadow-sm group",
                  f.color
                )}
                onClick={() => handleExport(f.id as any, 'catalog')}
              >
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                    {f.icon}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900">{f.name}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full gap-2 text-xs font-bold border-slate-200 bg-white group-hover:bg-slate-900 group-hover:text-white transition-colors"
                    disabled={isExporting !== null}
                  >
                    {isExporting?.id === f.id && isExporting?.type === 'catalog' ? (
                      <div className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    {isExporting?.id === f.id && isExporting?.type === 'catalog' ? 'Exporting...' : 'Download Catalog'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Section 2: Mapped Specification */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Mapped Product Specification</h2>
                <p className="text-sm text-slate-500">Download the mapping logic for your specific partner integration.</p>
              </div>
            </div>
            {(workflowStatus === 'approved' || workflowStatus === 'pending') ? (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-bold">
                {mappings.length} Mapped Fields
              </Badge>
            ) : (
              <Badge variant="outline" className="text-slate-400 border-slate-200 italic">
                Mapping Not Finalized
              </Badge>
            )}
          </div>

          {(workflowStatus === 'approved' || workflowStatus === 'pending') ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {formats.map((f) => (
                <Card 
                  key={`mapping-${f.id}`} 
                  className={cn(
                    "border-slate-200 cursor-pointer transition-all duration-200 shadow-sm group",
                    f.color
                  )}
                  onClick={() => handleExport(f.id as any, 'mapping')}
                >
                  <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                    <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                      {f.icon}
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-900">{f.name}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full gap-2 text-xs font-bold border-slate-200 bg-white group-hover:bg-slate-900 group-hover:text-white transition-colors"
                      disabled={isExporting !== null}
                    >
                      {isExporting?.id === f.id && isExporting?.type === 'mapping' ? (
                        <div className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      {isExporting?.id === f.id && isExporting?.type === 'mapping' ? 'Exporting...' : 'Download Mapping'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-slate-100">
                <Info className="w-6 h-6 text-slate-300" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-600 tracking-tight">Mapping Spec Not Ready</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">Please complete the review and approval workflow to download your partner-specific mapping specification.</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs font-bold border-slate-200 text-slate-500"
                onClick={() => router.push('/')}
              >
                Go to Dashboard
              </Button>
            </div>
          )}
        </section>
      </div>

      {/* Integration Note */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 flex gap-4">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
          <ExternalLink className="w-5 h-5 text-blue-600" />
        </div>
        <div className="space-y-2">
          <h4 className="font-bold text-blue-900">Enterprise Integration API</h4>
          <p className="text-sm text-blue-700 leading-relaxed">
            Synchronize these mappings directly with your PIM or ERP system via our Partner API.
          </p>
          <Button variant="link" className="text-blue-700 font-bold p-0 h-auto text-xs underline decoration-blue-300">
            View API Documentation
          </Button>
        </div>
      </div>
    </div>
  );
}
