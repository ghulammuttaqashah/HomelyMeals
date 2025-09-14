export default function Hero() {
  return (
    <section
      id="hero"
      className="h-[85vh] flex flex-col items-center justify-center text-center px-6"
      style={{ backgroundColor: "#c54218", color: "#fff9e9" }}
    >
      <h2 className="text-4xl md:text-6xl font-extrabold mb-6 drop-shadow-lg">
        Fresh, Homely & Delicious Meals
      </h2>
      <p className="text-lg md:text-xl mb-8 max-w-2xl text-[#fff9e9]/90">
        Bringing you authentic, hygienic, and affordable home-cooked meals made
        with love. Perfect for students, professionals, and families.
      </p>
      <a
        href="https://wa.me/1234567890"
        target="_blank"
        rel="noopener noreferrer"
        className="bg-[#fff9e9] hover:bg-[#f1e7d4] text-[#202b22] font-semibold px-6 py-3 rounded-xl shadow-lg transition"
      >
        Order Now
      </a>
    </section>
  );
}