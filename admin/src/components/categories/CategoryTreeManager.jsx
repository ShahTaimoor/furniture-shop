import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import CategoryNode from './CategoryNode';
import OneLoader from '@/components/ui/OneLoader';
import {
  createCategory,
  deleteCategory,
  fetchCategoryTree,
  updateCategory,
} from '@/api/categories';

const flattenTree = (nodes, depth = 0) =>
  nodes.flatMap((node) => [
    { ...node, depth },
    ...flattenTree(node.children ?? [], depth + 1),
  ]);

const collectDescendantIds = (node) => {
  const ids = new Set();
  const walk = (current) => {
    current.children?.forEach((child) => {
      ids.add(child._id);
      walk(child);
    });
  };
  walk(node);
  return ids;
};

const initialModalState = { mode: null, category: null, parentId: null };

const CategoryTreeManager = () => {
  const queryClient = useQueryClient();
  const [modalState, setModalState] = useState(initialModalState);
  const fileInputRef = useRef(null);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  const { data: tree = [], isLoading, isError, error } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: fetchCategoryTree,
  });

  const flattened = useMemo(() => flattenTree(tree), [tree]);

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      toast.success('Category created');
      queryClient.invalidateQueries({ queryKey: ['categories', 'tree'] });
      setModalState(initialModalState);
    },
    onError: (mutationError) => toast.error(mutationError?.message || 'Unable to create category'),
  });

  const updateMutation = useMutation({
    mutationFn: updateCategory,
    onSuccess: () => {
      toast.success('Category updated');
      queryClient.invalidateQueries({ queryKey: ['categories', 'tree'] });
      setModalState(initialModalState);
    },
    onError: (mutationError) => toast.error(mutationError?.message || 'Unable to update category'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      toast.success('Category deleted');
      queryClient.invalidateQueries({ queryKey: ['categories', 'tree'] });
    },
    onError: (mutationError) => toast.error(mutationError?.message || 'Unable to delete category'),
  });

  const openCreateModal = (parentId = null) => {
    setModalState({ mode: 'create', category: null, parentId });
  };

  const openEditModal = (category) => {
    setModalState({ mode: 'edit', category, parentId: category.parentId ?? null });
  };

  const handleDelete = (category) => {
    if (deleteMutation.isPending) return;
    deleteMutation.mutate(category._id);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const disallowedParentIds = useMemo(() => {
    if (modalState.mode !== 'edit' || !modalState.category) return new Set();
    const currentNode = flattened.find((item) => item._id === modalState.category._id);
    if (!currentNode) return new Set([modalState.category._id]);
    return collectDescendantIds(currentNode).add(currentNode._id);
  }, [modalState, flattened]);

  const parentOptions = useMemo(
    () =>
      [{ label: 'No parent (top level)', value: 'root' }].concat(
        flattened
          .filter((item) => !disallowedParentIds.has(item._id))
          .map((item) => ({
            value: item._id,
            label: `${'— '.repeat(item.depth)}${item.name}`,
          }))
      ),
    [flattened, disallowedParentIds]
  );

  useEffect(() => {
    if (!modalState.mode) {
      setImageFile(null);
      setRemoveImage(false);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    const existingImage =
      modalState.mode === 'edit'
        ? modalState.category?.picture?.secure_url ?? modalState.category?.image ?? null
        : null;

    setImageFile(null);
    setRemoveImage(false);
    setPreviewUrl(existingImage);
  }, [modalState]);

  useEffect(
    () => () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [previewUrl]
  );

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setImageFile(null);
      setPreviewUrl(
        modalState.mode === 'edit'
          ? modalState.category?.picture?.secure_url ?? modalState.category?.image ?? null
          : null
      );
      return;
    }

    setImageFile(file);
    setRemoveImage(false);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setRemoveImage(modalState.mode === 'edit');
  };

  const onSubmit = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = form.get('name')?.toString().trim();
    const parentValue = form.get('parent')?.toString() ?? 'root';
    const parentId = parentValue === 'root' ? null : parentValue;

    if (!name) {
      toast.error('Category name is required');
      return;
    }

    if (modalState.mode === 'create') {
      createMutation.mutate({
        name,
        parentId,
        imageFile,
        imageAlt: name,
      });
    } else if (modalState.mode === 'edit' && modalState.category) {
      updateMutation.mutate({
        id: modalState.category._id,
        name,
        parentId,
        imageFile,
        removeImage,
        imageAlt: name,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Categories</h1>
          <p className="text-sm text-slate-600">
            Manage a fully nested category tree. There is no limit to depth.
          </p>
        </div>
        <Button onClick={() => openCreateModal(null)} className="flex items-center gap-2">
          <Plus size={16} />
          Add root category
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        {isLoading && (
          <div className="py-10">
            <OneLoader size="small" text="Loading categories…" />
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 m-4">
            {error?.message || 'Unable to load categories.'}
          </div>
        )}

        {!isLoading && !isError && tree.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-100/60 p-10 text-center text-sm text-slate-500 m-4">
            No categories yet. Use the button above to create your first category.
          </div>
        )}

        {!isLoading && !isError && tree.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Slug</th>
                  <th className="px-3 py-2 font-semibold">Level</th>
                  <th className="px-3 py-2 font-semibold">Updated</th>
                  <th className="px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tree.map((node) => (
                  <CategoryNode
                    key={node._id}
                    node={node}
                    onAddChild={(current) => openCreateModal(current._id)}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                    deletingId={deleteMutation.isPending ? deleteMutation.variables : null}
                    onImageClick={(current) => {
                      const url = current.picture?.secure_url || current.image;
                      if (url) setImagePreview({ url, alt: current.picture?.alt || current.name });
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog
        open={!!modalState.mode}
        onOpenChange={(open) => {
          if (!open) setModalState(initialModalState);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>
                {modalState.mode === 'edit' ? 'Edit category' : 'Create category'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={modalState.category?.name ?? ''}
                  placeholder="Electronics, Furniture, …"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="parent">Parent category</Label>
                <Select
                  name="parent"
                  defaultValue={
                    modalState.parentId
                      ? modalState.parentId
                      : modalState.category?.parentId
                        ? modalState.category.parentId
                        : 'root'
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent" />
                  </SelectTrigger>
                  <SelectContent>
                    {parentOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Category image</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageChange}
                  ref={fileInputRef}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-slate-500">
                  Optional image used when showcasing this category in the storefront.
                </p>
                {previewUrl && (
                  <div className="flex items-center gap-4 pt-2">
                    <div className="h-16 w-16 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                      <img
                        src={previewUrl}
                        alt={`Preview for ${modalState.category?.name ?? 'category'}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={handleRemoveImage} disabled={isSubmitting}>
                      Remove image
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalState(initialModalState)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <OneLoader size="tiny" inline className="mr-2" /> : null}
                {modalState.mode === 'edit' ? 'Save changes' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!imagePreview} onOpenChange={(open) => !open && setImagePreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{imagePreview?.alt || 'Image preview'}</DialogTitle>
          </DialogHeader>
          {imagePreview && (
            <img
              src={imagePreview.url}
              alt={imagePreview.alt}
              className="max-h-[70vh] w-full rounded-md object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryTreeManager;

