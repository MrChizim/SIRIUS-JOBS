import Hero from './sections/Hero';
import ServicesGrid from './sections/ServicesGrid';
import HowItWorks from './sections/HowItWorks';
import ForProfessionalsSection from './sections/ForProfessionalsSection';
import ClosingCta from './sections/ClosingCta';

export default function Home() {
  return (
    <>
      <Hero />
      <ServicesGrid />
      <HowItWorks />
      <ForProfessionalsSection />
      <ClosingCta />
    </>
  );
}
