"use client";

import React, { useState } from 'react';
import { useConfigStore } from '@/stores/useConfigStore';
import { useMappingStore } from '@/stores/useMappingStore';
import { WorkflowTimeline } from '@/components/WorkflowTimeline';
import { DynamicTable } from '@/components/DynamicTable';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  UserCheck, 
  ArrowLeft,
  AlertCircle,
  Building2,
  Tag,
  Calendar,
  Globe,
  Briefcase,
  Gavel,
  History,
  Download,
  ChevronRight,
  ChevronDown,
  BrainCircuit
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export default function ApprovePage() {
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

  const handleFinalApprove = async () => {
    setIsSubmitting(true);
    try {
      await axios.post('http://localhost:8001/api/approve', {
        mapping_id: mappingId,
        approver: "Senior Merchandiser / Admin",
        status: "approved",
        business_context: businessContext,
        mappings
      });
      setWorkflowStatus('approved' as any);
      router.push('/');
    } catch (error) {
      console.error("Final approval failed", error);
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
        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">
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
      id: "validation",
      header: "Compliance Check",
      cell: ({ row }: any) => (
        row.original.warnings.length > 0 ? (
          <Badge variant="outline" className="text-rose-600 border-rose-100 bg-rose-50/50 gap-1">
            <AlertCircle className="w-3 h-3" />
            Warning
          </Badge>
        ) : (
          <Badge variant="outline" className="text-emerald-600 border-emerald-100 bg-emerald-50/50 gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Compliant
          </Badge>
        )
      )
    }
  ];

  return (
    <div className="space-y-8 pb-32">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Final Business Approval</h1>
              <p className="text-sm text-slate-500">Sign off on the retail attribute mapping for governance compliance.</p>
            </div>
          </div>
        </div>
        <Badge variant="outline" className={cn(
          "px-4 py-1.5 text-xs font-bold uppercase tracking-wider",
          workflowStatus === 'approved' ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200"
        )}>
          {workflowStatus === 'approved' ? 'MAPPING FINALIZED' : 'Awaiting Admin Sign-off'}
        </Badge>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Column - Governance Details */}
        <div className="col-span-8 space-y-8">
          {/* Summary Card */}
          <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-800">Integration Summary</CardTitle>
                  <CardDescription>Review the final parameters before approval.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                   <Badge className="bg-slate-900 text-white border-none">{mappings.length} Fields</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-6">
                {contextItems.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-400">
                      {item.icon}
                      <span className="text-[10px] uppercase font-bold tracking-wider">{item.label}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-700">{item.value || 'N/A'}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Specifications */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wider flex items-center gap-2">
              <Gavel className="w-4 h-4" />
              Mapping Specifications for Sign-off
            </h3>
            <div className="border rounded-xl overflow-hidden bg-white shadow-sm border-slate-200">
              <DynamicTable 
                columns={columns} 
                data={mappings} 
                searchKey="partner_attribute"
                renderExpandedRow={(row) => (
                  <div className="p-4 space-y-4 bg-blue-50/30 rounded-lg border border-blue-100 mx-4 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-blue-100 rounded-md text-blue-600 shrink-0">
                        <BrainCircuit className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">AI Approval Rationale</h4>
                        <p className="text-sm text-slate-600 leading-relaxed italic">
                          "{row.ai_reasoning}"
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              />
            </div>
          </div>
        </div>

        {/* Right Column - Workflow & History */}
        <div className="col-span-4 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                Workflow Lifecycle
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <WorkflowTimeline 
                stages={metadata.workflowStages as any} 
                currentStageId={workflowStatus === 'approved' ? 'activated' : 'business_approval'} 
              />
            </CardContent>
          </Card>

          <Card className="border-emerald-100 bg-emerald-50/30">
            <CardContent className="p-6 space-y-4">
              <h4 className="font-bold text-emerald-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                Admin Audit Note
              </h4>
              <p className="text-xs text-emerald-700 leading-relaxed italic">
                "By finalizing this approval, you confirm that all mapped attributes comply with the retailer's canonical data dictionary and business taxonomy rules for the {getLabel(metadata.categories, businessContext.category)} category."
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-24 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50 px-8 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Signed by</span>
          <span className="text-sm font-semibold text-slate-900">System Admin / Business User</span>
        </div>
        <div className="flex gap-4">
          {(workflowStatus as string) === 'approved' ? (
            <Button 
              className="h-12 px-12 gap-2 text-white font-bold shadow-lg bg-blue-600 hover:bg-blue-700 shadow-blue-100 transition-all"
              onClick={() => router.push('/export')}
            >
              <Download className="w-5 h-5" />
              Download Final Specification
            </Button>
          ) : (
            <>
              <Button 
                variant="outline" 
                className="h-12 px-8 border-slate-200 text-slate-600 font-bold"
                onClick={() => router.push('/review')}
              >
                Revise Review
              </Button>
              <Button 
                className={cn(
                  "h-12 px-12 gap-2 text-white font-bold shadow-lg transition-all",
                  (workflowStatus as string) === 'approved' ? "bg-slate-300 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 shadow-emerald-100"
                )}
                onClick={handleFinalApprove}
                disabled={isSubmitting || (workflowStatus as string) === 'approved'}
              >
                {isSubmitting ? <Clock className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5" />}
                {(workflowStatus as string) === 'approved' ? 'APPROVAL COMPLETED' : 'FINALIZE & SIGN OFF'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
