import CategoryTreeManager from '@/components/categories/CategoryTreeManager';
import SEO from '@/components/seo/SEO';

const AdminCategories = () => (
  <>
    <SEO
      title="Admin Category Manager"
      description="Create, reorder, and optimise product categories in the Ecommerce admin workspace."
      keywords={['admin categories', 'taxonomy manager']}
      noIndex
    />
    <div className="mx-auto max-w-6xl px-4 py-8">
      <CategoryTreeManager />
    </div>
  </>
);

export default AdminCategories;

