export default function HowItWorks() {
  const steps = [
    { step: "1", text: "Browse meals shared on daily basis" },
    { step: "2", text: "Place your order through WhatsApp" },
    { step: "3", text: "Get fresh food delivered" },
  ];

  return (
    <section id="howitworks" className="py-20 max-w-6xl mx-auto px-6">
      <h3 className="text-3xl font-bold text-green-400 mb-10 text-center">
        How It Works
      </h3>
      <div className="grid md:grid-cols-3 gap-8 text-center">
        {steps.map((item, idx) => (
          <div
            key={idx}
            className="bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-green-400/30 transition"
          >
            <div className="text-5xl font-bold text-green-400 mb-4">
              {item.step}
            </div>
            <p className="text-gray-200">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
