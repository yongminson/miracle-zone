import { FeatureLanding } from "@/components/seo/FeatureLanding";
import { featureMetadata } from "@/lib/seo/feature-pages";

export const metadata = featureMetadata("mbti");

export default function MbtiTestPage() {
  return <FeatureLanding feature="mbti" />;
}
