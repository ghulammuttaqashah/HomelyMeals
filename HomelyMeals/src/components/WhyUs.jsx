export default function WhyUs() {
  const features = [
    { icon: "🍴", text: "Hygienic & Freshly Cooked" },
    { icon: "💸", text: "Affordable & Value for Money" },
    { icon: "🏠", text: "Authentic Taste of Home" },
    { icon: "📲", text: "Easy Ordering via WhatsApp" },
  ];

  return (
    <section id="whyus" className="py-24 bg-[#fff9e9]">
      {/* Title */}
      <h3 className="text-4xl md:text-5xl font-extrabold text-[#c54218] text-center mb-12">
        Why Choose Us
      </h3>
      <div className="w-20 h-1 bg-[#c54218] mx-auto mb-8 rounded-full"></div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-4 sm:grid-cols-2 gap-8 max-w-6xl mx-auto px-6">
        {features.map((item, idx) => (
          <div
            key={idx}
            className="bg-white border border-[#f5e9db] p-8 rounded-xl shadow-md hover:shadow-lg hover:border-[#c54218] transition text-center"
          >
            {/* Icon */}
            <div className="text-5xl mb-4">{item.icon}</div>
            
            {/* Text */}
            <p className="text-lg font-medium text-[#13271c]">
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}