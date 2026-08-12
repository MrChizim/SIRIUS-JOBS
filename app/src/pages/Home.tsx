import Hero from './sections/Hero';
import ServicesGrid from './sections/ServicesGrid';
import HowItWorks from './sections/HowItWorks';
import ClosingCta from './sections/ClosingCta';

export default function Home() {
  return (
    <>
      <Hero />
      <ServicesGrid />
      <HowItWorks />
      <ClosingCta />
    </>
  );
}
