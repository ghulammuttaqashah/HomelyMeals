export default function WhyUs() {
  const features = [
    { icon: "🍴", text: "Hygienic & Freshly Cooked" },
    { icon: "💸", text: "Affordable & Value for Money" },
    { icon: "🏠", text: "Authentic Taste of Home" },
    { icon: "📲", text: "Easy Ordering via WhatsApp" },
  ];

  return (
    <section id="whyus" className="py-20 bg-gray-800">
      <h3 className="text-3xl font-bold text-green-400 mb-10 text-center">
        Why Choose Us
      </h3>
      <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto px-6 text-center">
        {features.map((item, idx) => (
          <div
            key={idx}
            className="bg-gray-900 p-6 rounded-xl shadow-lg hover:shadow-green-400/30 transition"
          >
            <div className="text-4xl mb-4">{item.icon}</div>
            <p className="text-gray-200">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}