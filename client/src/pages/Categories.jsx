import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { AllCategory } from "@/redux/slices/categories/categoriesSlice";
import OneLoader from "@/components/ui/OneLoader";
import SEO from "@/components/seo/SEO";

const Categories = () => {
  const dispatch = useDispatch();
  const { categories = [], status, error } = useSelector((state) => state.categories);

  useEffect(() => {
    if (status === "idle") {
      dispatch(AllCategory());
    }
  }, [dispatch, status]);

  const seoElement = (
    <SEO
      title="Shop by Category"
      description="Browse every Ecommerce product category and find what you need."
      keywords={["Ecommerce categories", "shop categories", "Ecommerce collections"]}
      openGraph={{ type: "website" }}
    />
  );

  if (status === "loading") {
    return (
      <>
        {seoElement}
        <div className="flex min-h-[50vh] items-center justify-center">
          <OneLoader size="large" text="Loading categories..." />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        {seoElement}
        <div className="mx-auto max-w-4xl rounded-lg border border-black/20 bg-black/5 p-6 text-center text-black">
          <h2 className="text-lg font-semibold">Unable to load categories</h2>
          <p className="mt-2 text-sm text-black">{error}</p>
        </div>
      </>
    );
  }

  return (
    <>
      {seoElement}
      <div className="py-10">
      <div className="mx-auto max-w-7xl px-4">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-slate-900">Browse categories</h1>
          <p className="mt-2 text-sm text-slate-500">
            Pick a department to jump straight to the products you need.
          </p>
        </header>

        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
          {categories.map((category) => (
            <Link
              key={category._id}
              to={category.slug ? `/category/${category.slug}` : "#"}
              className="group flex flex-col items-center gap-3 rounded-2xl px-4 py-5 text-center transition hover:shadow-md"
            >
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl bg-slate-100 transition group-hover:bg-slate-200">
                <img
                  src={category.image || "/logo.svg"}
                  alt={category.name}
                  className="h-full w-full object-contain"
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.src = "/logo.svg";
                  }}
                />
              </div>
              <span className="text-sm font-medium text-slate-800 group-hover:text-primary">
                {category.name}
              </span>
            </Link>
          ))}
        </div>

        {categories.length === 0 && (
          <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            We’re preparing our catalogue. Please check back soon!
          </div>
        )}
      </div>
      </div>
    </>
  );
};

export default Categories;

