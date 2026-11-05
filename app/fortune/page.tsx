import { FeatureLanding } from "@/components/seo/FeatureLanding";
import { featureMetadata } from "@/lib/seo/feature-pages";

export const metadata = featureMetadata("fortune");

export default function FortunePage() {
  return <FeatureLanding feature="fortune" />;
}
