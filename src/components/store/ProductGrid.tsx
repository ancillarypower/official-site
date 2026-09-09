import type { DisplayProduct } from "@/lib/types";
import { ProductCard } from "./ProductCard";

interface ProductGridProps { products: DisplayProduct[]; }

export function ProductGrid({ products }: ProductGridProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6">
      {products.map((product) => <ProductCard key={product.id} product={product} />)}
    </div>
  );
}
