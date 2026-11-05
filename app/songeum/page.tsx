import { FeatureLanding } from "@/components/seo/FeatureLanding";
import { featureMetadata } from "@/lib/seo/feature-pages";

export const metadata = featureMetadata("palm");

export default function SongeumPage() {
  return <FeatureLanding feature="palm" />;
}
