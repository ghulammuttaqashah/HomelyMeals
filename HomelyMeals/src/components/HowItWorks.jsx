export default function HowItWorks() {
  const steps = [
    { step: "1", text: "Browse meals shared on a daily basis" },
    { step: "2", text: "Place your order through WhatsApp" },
    { step: "3", text: "Get fresh food delivered" },
  ];

  return (
    <section id="howitworks" className="py-24 bg-[#fff9e9]">
      {/* Title */}
      <h3 className="text-4xl md:text-5xl font-extrabold text-[#c54218] text-center mb-12">
        How It Works
      </h3>
      <div className="w-20 h-1 bg-[#c54218] mx-auto mb-8 rounded-full"></div>

      {/* Steps */}
      <div className="grid md:grid-cols-3 gap-10 max-w-6xl mx-auto px-6">
        {steps.map((item, idx) => (
          <div
            key={idx}
            className="bg-white border border-[#f5e9db] p-8 rounded-2xl shadow-md hover:shadow-lg hover:border-[#c54218] transition text-center"
          >
            {/* Step Number in Circle */}
            <div className="flex items-center justify-center mx-auto w-16 h-16 rounded-full bg-[#c54218] text-white text-2xl font-bold mb-6">
              {item.step}
            </div>

            {/* Step Text */}
            <p className="text-lg font-medium text-[#13271c]">
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}