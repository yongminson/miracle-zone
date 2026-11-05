import { FeatureLanding } from "@/components/seo/FeatureLanding";
import { featureMetadata } from "@/lib/seo/feature-pages";

export const metadata = featureMetadata("ireum");

export default function IreumPage() {
  return <FeatureLanding feature="ireum" />;
}
