import { FeatureLanding } from "@/components/seo/FeatureLanding";
import { featureMetadata } from "@/lib/seo/feature-pages";

export const metadata = featureMetadata("gunghap");

export default function GunghapPage() {
  return <FeatureLanding feature="gunghap" />;
}
