export default function Hero() {
  return (
    <section
      id="hero"
      className="flex flex-col md:flex-row items-center justify-center text-center md:text-left px-6 gap-10 py-20 md:h-[85vh]"
      style={{ backgroundColor: "#c54218", color: "#fff9e9" }}
    >
      {/* Text Content */}
      <div className="flex-1">
        <h2 className="text-3xl sm:text-4xl md:text-6xl font-extrabold mb-6 drop-shadow-lg leading-tight">
          Fresh, Homely & Delicious Meals
        </h2>
        <p className="text-base sm:text-lg md:text-xl mb-8 max-w-2xl text-[#fff9e9]/90 mx-auto md:mx-0">
          Bringing you authentic, hygienic, and affordable home-cooked meals
          made with love. Perfect for students, professionals, and families.
        </p>
        <a
          href="https://wa.me/1234567890"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#fff9e9] hover:bg-[#f1e7d4] text-[#202b22] font-semibold px-6 py-3 rounded-xl shadow-lg transition w-full sm:w-auto"
        >
          Order Now
        </a>
      </div>

      {/* Hero Image */}
      <div className="flex-1 flex justify-center items-center mt-8 md:mt-0">
        <img
          src="/heroimage.png" // ✅ from public folder
          alt="Delicious Homely Meals"
          className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg h-auto object-contain"
        />
      </div>
    </section>
  );
}