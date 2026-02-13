import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCreateOrganization, useCheckOrgSlug } from '@/hooks/use-organizations';

const createOrgSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z.string().min(3, 'Slug must be at least 3 characters').max(60).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
  type: z.enum(['company', 'family']).default('company'),
  description: z.string().max(500).optional(),
});

type CreateOrgFormData = z.infer<typeof createOrgSchema>;

function CreateOrgContent() {
  const createOrg = useCreateOrganization();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<CreateOrgFormData>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: { name: '', slug: '', type: 'company', description: '' },
  });

  const slugValue = form.watch('slug');
  const { data: slugAvailable } = useCheckOrgSlug(slugValue);

  function generateSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  }

  async function onSubmit(data: CreateOrgFormData) {
    setError(null);
    try {
      const { description, ...rest } = data;
      const result = await createOrg.mutateAsync({
        ...rest,
        ...(description ? { description } : {}),
      });
      if (result) {
        window.location.href = `/dashboard/organizations/${result.id}`;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization');
    }
  }

  return (
    <Card className="max-w-lg">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle>Create Organization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              {...form.register('name', {
                onChange: (e) => {
                  const currentSlug = form.getValues('slug');
                  const nameSlug = generateSlug(e.target.value);
                  // Auto-generate slug if it hasn't been manually edited
                  if (!currentSlug || currentSlug === generateSlug(form.getValues('name').slice(0, -1) + '')) {
                    form.setValue('slug', nameSlug);
                  }
                },
              })}
              placeholder="My Organization"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" {...form.register('slug')} placeholder="my-organization" />
            {form.formState.errors.slug && (
              <p className="text-sm text-destructive">{form.formState.errors.slug.message}</p>
            )}
            {slugValue && slugValue.length >= 3 && slugAvailable === false && (
              <p className="text-sm text-destructive">This slug is already taken</p>
            )}
            {slugValue && slugValue.length >= 3 && slugAvailable === true && (
              <p className="text-sm text-green-600">Slug is available</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={form.watch('type')}
              onValueChange={(val) => form.setValue('type', val as 'company' | 'family')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="family">Family</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" {...form.register('description')} rows={3} />
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button type="button" variant="outline" asChild>
            <a href="/dashboard/organizations">Cancel</a>
          </Button>
          <Button type="submit" disabled={createOrg.isPending}>
            {createOrg.isPending ? 'Creating...' : 'Create'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export function CreateOrgView() {
  return (
    <QueryProvider>
      <CreateOrgContent />
    </QueryProvider>
  );
}
