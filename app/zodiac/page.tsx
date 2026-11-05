import { FeatureLanding } from "@/components/seo/FeatureLanding";
import { featureMetadata } from "@/lib/seo/feature-pages";

export const metadata = featureMetadata("zodiac");

export default function ZodiacPage() {
  return <FeatureLanding feature="zodiac" />;
}
