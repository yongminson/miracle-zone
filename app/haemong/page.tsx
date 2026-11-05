import { FeatureLanding } from "@/components/seo/FeatureLanding";
import { featureMetadata } from "@/lib/seo/feature-pages";

export const metadata = featureMetadata("dream");

export default function HaemongPage() {
  return <FeatureLanding feature="dream" />;
}
