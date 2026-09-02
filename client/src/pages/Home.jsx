import ProductList from '@/components/custom/ProductList';
import React, { useMemo } from 'react';
import { useSearchContext } from '@/contexts/SearchContext';
import SEO from '@/components/seo/SEO';

const Home = () => {
  const searchContext = useSearchContext();

  const structuredData = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Ecommerce',
      url: typeof window !== 'undefined' ? window.location.origin : 'https://ecommerce.store',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${typeof window !== 'undefined' ? window.location.origin : 'https://ecommerce.store'}/search?query={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    }),
    []
  );

  return (
    <>
      <SEO
        title="Ecommerce | Online Store"
        description="Shop curated collections, storage, lighting, and lifestyle pieces on Ecommerce. Discover seasonal collections, flexible delivery, and personalised shopping support."
        keywords={['Ecommerce', 'online shopping', 'lifestyle products']}
        openGraph={{ type: 'website', title: 'Ecommerce Store' }}
        structuredData={structuredData}
      />
      <div className="space-y-8">
        <ProductList
          search={searchContext?.search}
          gridType={searchContext?.gridType}
          onGridTypeChange={searchContext?.handleGridTypeChange}
        />
      </div>
    </>
  );
};

export default Home;