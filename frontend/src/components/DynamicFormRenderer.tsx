import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface FieldConfig {
  id: string;
  label: string;
  options: { id: string; label: string }[];
  placeholder?: string;
}

interface DynamicFormRendererProps {
  fields: FieldConfig[];
  values: Record<string, string>;
  onChange: (id: string, value: string) => void;
}

export const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({ fields, values, onChange }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {fields.map((field) => (
        <div key={field.id} className="space-y-2">
          <Label htmlFor={field.id} className="text-sm font-medium text-slate-700">
            {field.label}
          </Label>
          <Select
            value={values[field.id] || ''}
            onValueChange={(value) => onChange(field.id, value)}
          >
            <SelectTrigger id={field.id} className="w-full bg-white border-slate-200">
              <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
};
