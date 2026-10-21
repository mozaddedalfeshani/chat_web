import FeatureCarousel from "./feature-carousel";

/** Right side of the sign-in card: the feature stack fills the height. */
export default function LoginHero() {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col lg:pl-8">
      <FeatureCarousel />
    </div>
  );
}
