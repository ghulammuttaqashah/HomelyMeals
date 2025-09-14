export default function Hero() {
  return (
    <section
      id="hero"
      className="h-screen flex flex-col justify-center items-center text-center px-6"
    >
      <h2 className="text-4xl md:text-6xl font-bold text-green-400">
        Fresh, Hygienic, Home-Cooked Meals
      </h2>
      <p className="mt-4 text-lg text-gray-300 max-w-2xl">
        Tired of unhealthy hostel food or expensive hotel meals? <br />
        We bring the taste of home straight to your plate.
      </p>
      <a
        href="https://wa.me/1234567890"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg text-lg"
      >
        Order on WhatsApp
      </a>
    </section>
  );
}