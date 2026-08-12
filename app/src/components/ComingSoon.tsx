export default function ComingSoon({ title }: { title: string }) {
  return (
    <section className="container mx-auto px-4 py-24 text-center lg:px-8">
      <h1 className="text-4xl font-black text-gray-900">{title}</h1>
      <p className="mt-4 text-lg text-gray-600">This page is being rebuilt. Check back soon.</p>
    </section>
  );
}
