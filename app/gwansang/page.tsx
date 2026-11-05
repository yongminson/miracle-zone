import { FeatureLanding } from "@/components/seo/FeatureLanding";
import { featureMetadata } from "@/lib/seo/feature-pages";

export const metadata = featureMetadata("gwansang");

export default function GwansangPage() {
  return <FeatureLanding feature="gwansang" />;
}
