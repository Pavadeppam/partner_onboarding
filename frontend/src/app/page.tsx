"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useConfigStore } from '@/stores/useConfigStore';
import { DynamicFormRenderer } from '@/components/DynamicFormRenderer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Upload, FileText, MousePointer2, ArrowRight, Search, Tag, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

import { useMappingStore } from '@/stores/useMappingStore';

export default function LandingPage() {
  const router = useRouter();
  const { metadata, businessContext, setBusinessContext } = useConfigStore();
  const { setConfigurationMethod, configurationMethod, mappings, workflowStatus } = useMappingStore();

  const formFields = [
    { id: 'businessModel', label: 'Business Model', options: metadata.businessModels },
    { id: 'department', label: 'Business Unit', options: metadata.businessUnits },
    { id: 'category', label: 'Category', options: metadata.categories },
    { id: 'season', label: 'Season', options: metadata.seasons },
    { id: 'region', label: 'Region', options: metadata.regions },
  ];

  const configMethods = [
    {
      id: 'browse',
      title: 'Browse Retailer Attributes',
      description: 'Explore the canonical attribute catalog and select what you need.',
      icon: <Search className="w-8 h-8 text-blue-500" />,
    },
    {
      id: 'upload',
      title: 'Upload Partner CSV',
      description: 'Upload your existing product feed for AI-powered mapping.',
      icon: <Upload className="w-8 h-8 text-indigo-500" />,
    },
    {
      id: 'manual',
      title: 'Manual Entry',
      description: 'Define partner attributes manually for a custom integration.',
      icon: <MousePointer2 className="w-8 h-8 text-violet-500" />,
    },
  ];

  const handleNext = () => {
    if (configurationMethod) {
      router.push('/workspace');
    }
  };

  return (
    <div className="space-y-12 pb-20">
      {/* Hero Section */}
      <section className="text-center space-y-4 pt-8">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl"
        >
          AI-Assisted Product Attribute Configuration
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl text-slate-500 max-w-2xl mx-auto"
        >
          Configure partner-specific product feeds in minutes using self-service onboarding.
        </motion.p>
      </section>

      {/* Active Onboarding Tasks Section */}
      {mappings.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800">Active Onboarding Tasks</h2>
            <Badge className={cn(
              "px-3 py-1 font-bold",
              workflowStatus === 'pending' ? "bg-amber-100 text-amber-700 border-amber-200" : 
              workflowStatus === 'approved' ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
              "bg-blue-100 text-blue-700 border-blue-200"
            )}>
              {workflowStatus === 'pending' ? 'WAITING FOR APPROVAL' : 
               workflowStatus === 'approved' ? 'MAPPING FINALIZED' :
               'DRAFT IN PROGRESS'}
            </Badge>
          </div>
          
          <Card 
            className={cn(
              "border shadow-sm overflow-hidden cursor-pointer transition-colors group",
              workflowStatus === 'approved' ? "border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/50" : 
              workflowStatus === 'pending' ? "border-amber-200 bg-amber-50/30 hover:bg-amber-50/50" :
              "border-blue-200 bg-blue-50/30 hover:bg-blue-50/50"
            )}
            onClick={() => router.push(workflowStatus === 'approved' ? '/approve' : workflowStatus === 'pending' ? '/approve' : '/workspace')}
          >
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm border transition-colors",
                  workflowStatus === 'approved' ? "bg-white border-emerald-100 group-hover:border-emerald-300" : "bg-white border-blue-100 group-hover:border-blue-300"
                )}>
                  <FileText className={cn("w-6 h-6", workflowStatus === 'approved' ? "text-emerald-600" : "text-blue-600")} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                    {businessContext.partnerName || 'New Partner Integration'}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" />
                      ID: {businessContext.partnerId || 'N/A'}
                    </span>
                    <Separator orientation="vertical" className="h-3" />
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {mappings.length} Attributes
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push('/workspace');
                  }}
                >
                  {workflowStatus === 'approved' ? 'View Catalog' : workflowStatus === 'pending' ? 'View Details' : 'Continue Mapping'}
                </Button>
                <Button 
                  className={cn(
                    "shadow-md",
                    workflowStatus === 'approved' ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100" : 
                    workflowStatus === 'pending' ? "bg-amber-600 hover:bg-amber-700 shadow-amber-100" :
                    "bg-blue-600 hover:bg-blue-700 shadow-blue-100"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (workflowStatus === 'approved') {
                      router.push('/export');
                    } else {
                      router.push('/approve');
                    }
                  }}
                >
                  {workflowStatus === 'approved' ? 'Download Export' : workflowStatus === 'pending' ? 'Go to Approval' : 'Review & Finalize'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Business Context Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">Business Context</h2>
          <span className="text-sm text-slate-400 font-medium">Step 1 of 3</span>
        </div>
        
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-lg font-semibold text-slate-700">Onboarding Scope</CardTitle>
            <CardDescription>Select the business parameters for this integration.</CardDescription>
          </CardHeader>
          <CardContent className="pt-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
              <div className="space-y-2">
                <Label htmlFor="partnerName" className="text-sm font-medium text-slate-700">Partner Name</Label>
                <Input 
                  id="partnerName" 
                  placeholder="Enter partner name (e.g. FashionCo)" 
                  value={businessContext.partnerName}
                  onChange={(e) => setBusinessContext({ partnerName: e.target.value })}
                  className="bg-white border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partnerId" className="text-sm font-medium text-slate-700">Partner ID</Label>
                <Input 
                  id="partnerId" 
                  placeholder="Enter unique partner ID" 
                  value={businessContext.partnerId}
                  onChange={(e) => setBusinessContext({ partnerId: e.target.value })}
                  className="bg-white border-slate-200"
                />
              </div>
            </div>

            <DynamicFormRenderer 
              fields={formFields}
              values={businessContext as unknown as Record<string, string>}
              onChange={(id, value) => setBusinessContext({ [id]: value })}
            />
          </CardContent>
        </Card>
      </section>

      {/* Configuration Method Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">Configuration Method</h2>
          <span className="text-sm text-slate-400 font-medium">Step 2 of 3</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {configMethods.map((method, index) => (
            <motion.div
              key={method.id}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                className={`cursor-pointer h-full transition-all border-2 ${
                  configurationMethod === method.id ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200 hover:border-blue-200'
                }`}
                onClick={() => {
                  setConfigurationMethod(method.id as any);
                  router.push('/workspace');
                }}
              >
                <CardContent className="pt-8 flex flex-col items-center text-center space-y-4">
                  <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                    {method.icon}
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg text-slate-800">{method.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{method.description}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer Action */}
      <div className="flex justify-end pt-8 border-t border-slate-200">
        <Button 
          size="lg" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 gap-2 shadow-lg shadow-blue-200"
          onClick={handleNext}
        >
          Continue to Workspace
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}


