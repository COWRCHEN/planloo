import { useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTaskTemplates, useApplyTemplate } from '@/hooks/use-tasks';
import type { TaskTemplateInfo } from '@/hooks/use-tasks';
import { cn } from '@/lib/utils';

interface TemplatePickerDialogProps {
  eventUuid: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplatePickerDialog({
  eventUuid,
  open,
  onOpenChange,
}: TemplatePickerDialogProps) {
  const { data: templates, isLoading } = useTaskTemplates(eventUuid);
  const applyTemplate = useApplyTemplate(eventUuid);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplateInfo | null>(null);
  const [startDate, setStartDate] = useState<Date>(new Date());

  const handleSelectTemplate = (template: TaskTemplateInfo) => {
    setSelectedTemplate(template);
    setStartDate(new Date());
  };

  const handleBack = () => {
    setSelectedTemplate(null);
  };

  const handleConfirm = async () => {
    if (!selectedTemplate) return;
    try {
      await applyTemplate.mutateAsync({
        templateId: selectedTemplate.id,
        startDate: startDate.toISOString(),
      });
      setSelectedTemplate(null);
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedTemplate(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {selectedTemplate ? (
          <>
            <DialogHeader>
              <DialogTitle>Set Start Date</DialogTitle>
              <DialogDescription>
                Choose when to start planning. Task due dates for{' '}
                <span className="font-medium">{selectedTemplate.name}</span> will be
                scheduled forward from this date.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !startDate && 'text-muted-foreground'
                      )}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2"
                      >
                        <path d="M8 2v4" />
                        <path d="M16 2v4" />
                        <rect width="18" height="18" x="3" y="4" rx="2" />
                        <path d="M3 10h18" />
                      </svg>
                      {format(startDate, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        if (date) setStartDate(date);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-sm font-medium">{selectedTemplate.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {selectedTemplate.taskCount} tasks across{' '}
                  {selectedTemplate.categories.length} categories
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={applyTemplate.isPending}
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={applyTemplate.isPending}
                >
                  {applyTemplate.isPending ? 'Applying…' : 'Apply Template'}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Apply Task Template</DialogTitle>
              <DialogDescription>
                Choose a pre-built template to add tasks to your event.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-full" />
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex gap-2">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-20" />
                        </div>
                        <Skeleton className="h-9 w-28" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                templates?.map((template) => (
                  <Card key={template.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {template.description}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {template.taskCount} tasks
                        </span>
                        {template.categories.length > 0 && (
                          <>
                            <span className="text-muted-foreground">·</span>
                            {template.categories.map((cat) => (
                              <Badge
                                key={cat}
                                variant="secondary"
                                className="text-xs"
                              >
                                {cat}
                              </Badge>
                            ))}
                          </>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSelectTemplate(template)}
                      >
                        Apply Template
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
