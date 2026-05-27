"use client";

import React, { useState } from 'react';
import { useConfigStore } from '@/stores/useConfigStore';
import { useMappingStore } from '@/stores/useMappingStore';
import { WorkflowTimeline } from '@/components/WorkflowTimeline';
import { DynamicTable } from '@/components/DynamicTable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Clock, 
  Download, 
  FileText, 
  Save, 
  Send,
  ArrowLeft,
  AlertCircle,
  Building2,
  Tag,
  Calendar,
  Globe,
  Briefcase,
  ChevronRight,
  ChevronDown,
  BrainCircuit
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export default function ReviewPage() {
  const router = useRouter();
  const { metadata, businessContext } = useConfigStore();
  const { mappings, mappingId, setWorkflowStatus, workflowStatus } = useMappingStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to get label from metadata
  const getLabel = (list: any[], id: string) => list.find(item => item.id === id)?.label || id;

  const contextItems = [
    { label: 'Business Model', value: getLabel(metadata.businessModels, businessContext.businessModel), icon: <Briefcase className="w-3.5 h-3.5" /> },
    { label: 'Business Unit', value: getLabel(metadata.businessUnits, businessContext.department), icon: <Building2 className="w-3.5 h-3.5" /> },
    { label: 'Category', value: getLabel(metadata.categories, businessContext.category), icon: <Tag className="w-3.5 h-3.5" /> },
    { label: 'Season', value: getLabel(metadata.seasons, businessContext.season), icon: <Calendar className="w-3.5 h-3.5" /> },
    { label: 'Region', value: getLabel(metadata.regions, businessContext.region), icon: <Globe className="w-3.5 h-3.5" /> },
  ];

  const stats = [
    { label: "Total Attributes", value: mappings.length, icon: <FileText className="w-5 h-5 text-blue-600" /> },
    { label: "Auto-Mapped", value: mappings.filter(m => m.confidence > 0.8).length, icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" /> },
    { label: "Manual Review", value: mappings.filter(m => m.confidence <= 0.8).length, icon: <Clock className="w-5 h-5 text-amber-500" /> },
    { label: "Validation Issues", value: mappings.filter(m => m.warnings.length > 0).length, icon: <AlertCircle className="w-5 h-5 text-rose-500" /> },
  ];

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await axios.post('http://localhost:8001/api/approve', {
        mapping_id: mappingId,
        approver: "Business User",
        status: 'pending',
        business_context: businessContext,
        mappings
      });
      setWorkflowStatus('pending');
      router.push('/');
    } catch (error) {
      console.error("Submission failed", error);
    } finally {
      setIsSubmitting(false);
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
      header: "Partner Field",
      cell: ({ row }: any) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900">{row.original.partner_attribute}</span>
          <span className="text-[10px] text-slate-400 uppercase font-bold">{row.original.description || "No description"}</span>
        </div>
      )
    },
    {
      accessorKey: "suggested_mapping",
      header: "Internal Field",
      cell: ({ row }: any) => (
        <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-slate-200">
          <span className="font-mono">
            {(() => {
              const m = row.original.suggested_mapping;
              const attributeId = m?.id || m?.internal_attribute;
              let group = m?.group || m?.metadata?.group || "";
              if (!group && attributeId) {
                for (const g of (metadata.attributeCatalog || [])) {
                  if ((g.attributes || []).some((a: any) => a.id === attributeId)) {
                    group = g.group;
                    break;
                  }
                }
              }
              group = group || "Unknown";
              if (!attributeId) return "Unmapped";
              return `{\"group\":\"${group}\",\"attribute\":\"${attributeId}\"}`;
            })()}
          </span>
        </Badge>
      )
    },
    {
      accessorKey: "confidence",
      header: "Confidence",
      cell: ({ row }: any) => (
        <span className={`text-sm font-bold ${row.original.confidence > 0.8 ? 'text-emerald-600' : 'text-amber-500'}`}>
          {(row.original.confidence * 100).toFixed(0)}%
        </span>
      )
    },
    {
      id: "validation",
      header: "Validation Status",
      cell: ({ row }: any) => (
        row.original.warnings.length > 0 ? (
          <div className="flex items-center gap-1.5 text-rose-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs font-medium">Issue</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-medium">Valid</span>
          </div>
        )
      )
    },
    {
      id: "status",
      header: "Approval Status",
      cell: () => (
        <Badge className={cn(
          "font-medium text-[10px]",
          workflowStatus === 'approved' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
        )}>
          {workflowStatus === 'approved' ? 'FINALIZED' : 'PENDING APPROVAL'}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-8 pb-32">
      {/* Context Summary Header */}
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
        <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
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

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Workspace
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Final Review & Governance</h1>
        </div>
        <Badge variant="outline" className={cn(
          "px-3 py-1",
          workflowStatus === 'approved' ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-amber-50 text-amber-600 border-amber-200"
        )}>
          {workflowStatus === 'approved' ? 'Mapping Finalized' : 'Review Pending'}
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="border-slate-200 shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-slate-50 rounded-xl">
                {stat.icon}
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-slate-900">{stat.value}</span>
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{stat.label}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Main Review Table */}
        <div className="col-span-9 space-y-6">
          <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wider">Mapping Specification</h3>
          <DynamicTable 
            columns={columns} 
            data={mappings} 
            searchKey="partner_attribute"
            infiniteScroll={true}
            renderExpandedRow={(row) => (
              <div className="p-4 space-y-4 bg-blue-50/30 rounded-lg border border-blue-100 mx-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-blue-100 rounded-md text-blue-600 shrink-0">
                    <BrainCircuit className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">AI Mapping Rationale</h4>
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
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Governance Compliance</h4>
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

        {/* Workflow Timeline */}
        <div className="col-span-3 space-y-6">
          <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wider">Workflow Timeline</h3>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <WorkflowTimeline 
                stages={metadata.workflowStages as any} 
                currentStageId={
                  workflowStatus === 'approved' ? 'activated' : 
                  workflowStatus === 'pending' ? 'business_approval' : 
                  'partner_review'
                } 
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-200 shadow-lg z-50 px-8 flex items-center justify-between">
        <div className="flex gap-4">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Download Mapping
          </Button>
          <Button variant="outline" className="gap-2">
            <FileText className="w-4 h-4" />
            Export PDF
          </Button>
        </div>
        <div className="flex gap-4">
          <Button 
            className={cn(
              "px-8 gap-2 shadow-lg text-white",
              workflowStatus === 'pending' || workflowStatus === 'approved' ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
            )}
            onClick={handleApprove}
            disabled={isSubmitting || workflowStatus === 'pending' || workflowStatus === 'approved'}
          >
            {isSubmitting ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {workflowStatus === 'pending' ? 'Awaiting Final Sign-off' : workflowStatus === 'approved' ? 'Mapping Finalized' : 'Submit For Approval'}
          </Button>
        </div>
      </div>
    </div>
  );
}
