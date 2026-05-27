import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Attribute {
  id: string;
  label: string;
  type: string;
  mandatory: boolean;
}

interface AttributeGroup {
  group: string;
  attributes: Attribute[];
}

interface MetadataAccordionProps {
  data: AttributeGroup[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export function MetadataAccordion({ data, selectedIds, onToggle }: MetadataAccordionProps) {
  return (
    <Accordion multiple className="w-full space-y-2">
      {data.map((group, index) => (
        <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg bg-white px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">{group.group}</span>
              <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                {group.attributes.length}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-3">
              {group.attributes.map((attr) => (
                <div key={attr.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-50 transition-colors">
                  <Checkbox 
                    id={attr.id} 
                    checked={selectedIds.includes(attr.id)}
                    onCheckedChange={() => onToggle(attr.id)}
                  />
                  <div className="flex flex-col flex-1">
                    <Label htmlFor={attr.id} className="text-sm font-medium text-slate-700 cursor-pointer">
                      {attr.label}
                    </Label>
                    <span className="text-xs text-slate-500 uppercase font-medium">{attr.type}</span>
                  </div>
                  {attr.mandatory && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1 border-red-200 text-red-600 bg-red-50">
                      Mandatory
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
